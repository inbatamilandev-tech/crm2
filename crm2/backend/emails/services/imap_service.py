import imaplib
import email as email_lib
import os
import logging
from email.header import decode_header
from email.utils import parseaddr, parsedate_to_datetime
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


def _decode_header_value(value):
    """Safely decode an email header value."""
    if not value:
        return ''
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            try:
                decoded.append(part.decode(charset or 'utf-8', errors='replace'))
            except Exception:
                decoded.append(part.decode('latin-1', errors='replace'))
        else:
            decoded.append(part)
    return ''.join(decoded)


def _get_email_body(msg):
    """Extract plain text and HTML body from email message."""
    body_plain = ''
    body_html = ''

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get('Content-Disposition', ''))

            if 'attachment' in content_disposition:
                continue

            if content_type == 'text/plain' and not body_plain:
                payload = part.get_payload(decode=True)
                charset = part.get_content_charset() or 'utf-8'
                body_plain = payload.decode(charset, errors='replace') if payload else ''

            elif content_type == 'text/html' and not body_html:
                payload = part.get_payload(decode=True)
                charset = part.get_content_charset() or 'utf-8'
                body_html = payload.decode(charset, errors='replace') if payload else ''
    else:
        payload = msg.get_payload(decode=True)
        charset = msg.get_content_charset() or 'utf-8'
        content_type = msg.get_content_type()
        text = payload.decode(charset, errors='replace') if payload else ''
        if content_type == 'text/html':
            body_html = text
        else:
            body_plain = text

    return body_plain, body_html


class IMAPService:
    """
    Connects to Gmail (or any IMAP server) and fetches unseen emails
    into the CRM Email inbox.
    """

    IMAP_HOST = os.getenv('IMAP_HOST', 'imap.gmail.com')
    IMAP_PORT = int(os.getenv('IMAP_PORT', 993))
    IMAP_USER = os.getenv('IMAP_USER') or os.getenv('EMAIL_HOST_USER', '')
    IMAP_PASSWORD = os.getenv('IMAP_PASSWORD') or os.getenv('EMAIL_HOST_PASSWORD', '')
    IMAP_MAILBOX = os.getenv('IMAP_MAILBOX', 'INBOX')

    @classmethod
    def fetch_inbox(cls, mark_as_read=False, user=None, limit=50):
        """
        Connect to IMAP, fetch UNSEEN emails, save them as inbox records.

        Returns: (fetched_count, error_message)
        """
        from emails.models import Email

        if not cls.IMAP_USER or not cls.IMAP_PASSWORD:
            msg = "IMAP credentials not configured. Set IMAP_USER and IMAP_PASSWORD (or EMAIL_HOST_USER/PASSWORD) in .env"
            logger.error(f"[IMAPService] {msg}")
            return 0, msg

        try:
            logger.info(f"[IMAPService] Connecting to {cls.IMAP_HOST}:{cls.IMAP_PORT} as {cls.IMAP_USER}")
            mail = imaplib.IMAP4_SSL(cls.IMAP_HOST, cls.IMAP_PORT)
            mail.login(cls.IMAP_USER, cls.IMAP_PASSWORD)
            mail.select(cls.IMAP_MAILBOX)

            # Search for UNSEEN (unread) messages
            status, message_ids = mail.search(None, 'UNSEEN')
            if status != 'OK':
                mail.logout()
                return 0, "Failed to search IMAP mailbox."

            ids = message_ids[0].split()
            logger.info(f"[IMAPService] Found {len(ids)} unseen message(s).")

            # Limit how many we fetch at once
            ids = ids[-limit:]  # take the most recent N

            fetched = 0
            for msg_id in ids:
                try:
                    status, msg_data = mail.fetch(msg_id, '(RFC822)')
                    if status != 'OK':
                        continue

                    raw_email = msg_data[0][1]
                    msg = email_lib.message_from_bytes(raw_email)

                    # Parse headers
                    subject = _decode_header_value(msg.get('Subject', '(No Subject)'))
                    from_raw = _decode_header_value(msg.get('From', ''))
                    to_raw = _decode_header_value(msg.get('To', cls.IMAP_USER))

                    _, from_addr = parseaddr(from_raw)
                    _, to_addr = parseaddr(to_raw)

                    if not from_addr:
                        from_addr = from_raw
                    if not to_addr:
                        to_addr = cls.IMAP_USER

                    # Parse body
                    body_plain, body_html = _get_email_body(msg)

                    # Avoid duplicates: check by subject + from_email + approximate content
                    # Use Message-ID header if available
                    message_id_header = msg.get('Message-ID', '').strip()

                    if message_id_header:
                        existing = Email.objects.filter(
                            provider_message_id=message_id_header,
                            status__in=['inbox', 'received']
                        ).exists()
                        if existing:
                            logger.debug(f"[IMAPService] Skipping duplicate: {message_id_header}")
                            continue

                    # Create inbox record
                    email_record = Email.objects.create(
                        from_email=from_addr[:254],
                        to_email=to_addr[:254],
                        subject=subject[:255],
                        body=body_plain[:10000] if body_plain else body_html[:500],
                        html_body=body_html[:50000] if body_html else None,
                        status='inbox',
                        provider_message_id=message_id_header or None,
                        created_by=user,
                    )

                    # Mark as read on server if requested
                    if mark_as_read:
                        mail.store(msg_id, '+FLAGS', '\\Seen')

                    fetched += 1
                    logger.info(f"[IMAPService] Saved email #{email_record.id}: '{subject}' from {from_addr}")

                    # Emit real-time notification if user is provided
                    if user:
                        try:
                            from users.models import Notification
                            from users.serializers import NotificationSerializer
                            from realtime.bus import emit_notification

                            notification = Notification.objects.create(
                                user=user,
                                title="New Email Received",
                                message=f"New email from {from_addr}: {subject}",
                                type="info",
                                link="/emails"
                            )
                            notif_data = NotificationSerializer(notification).data
                            emit_notification(user.id, notif_data)
                        except Exception as notif_err:
                            logger.warning(f"[IMAPService] Notification failed: {notif_err}")

                except Exception as parse_err:
                    logger.error(f"[IMAPService] Failed to parse message {msg_id}: {parse_err}")
                    continue

            mail.logout()
            logger.info(f"[IMAPService] Inbox sync complete. Fetched {fetched} new email(s).")
            return fetched, None

        except imaplib.IMAP4.error as imap_err:
            msg = f"IMAP authentication/connection error: {imap_err}"
            logger.error(f"[IMAPService] {msg}")
            return 0, msg
        except ConnectionRefusedError:
            msg = f"Cannot connect to IMAP server {cls.IMAP_HOST}:{cls.IMAP_PORT}"
            logger.error(f"[IMAPService] {msg}")
            return 0, msg
        except Exception as e:
            msg = f"Unexpected IMAP error: {e}"
            logger.error(f"[IMAPService] {msg}")
            return 0, msg
