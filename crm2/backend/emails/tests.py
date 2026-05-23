from django.test import TestCase
from unittest.mock import patch
from emails.models import Email
from emails.services.email_service import EmailService
from users.models import User
from leads.models import Lead

class EmailServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.lead = Lead.objects.create(name='Test Lead', status='new')
        self.email = Email.objects.create(
            to_email='recipient@example.com',
            from_email='onboarding@resend.dev',
            subject='Test Subject',
            body='Test Body',
            status='draft',
            created_by=self.user,
            lead=self.lead
        )

    @patch('resend.Emails.send')
    def test_send_email_success(self, mock_send):
        mock_send.return_value = {'id': 'test_message_id'}
        
        with patch('os.getenv', return_value='test_key'):
            email = EmailService.send_email(self.email)
            
        self.assertEqual(email.status, 'sent')
        self.assertEqual(email.provider_message_id, 'test_message_id')
        self.assertIsNotNone(email.sent_at)

    @patch('resend.Emails.send')
    def test_send_email_failure(self, mock_send):
        mock_send.side_effect = Exception("API Error")
        
        with patch('os.getenv', return_value='test_key'):
            email = EmailService.send_email(self.email)
            
        self.assertEqual(email.status, 'failed')
        self.assertEqual(email.failed_reason, "API Error")

    def test_handle_webhook_delivered(self):
        self.email.provider_message_id = 'test_message_id'
        self.email.status = 'sent'
        self.email.save()
        
        payload = {
            'type': 'email.delivered',
            'data': {'email_id': 'test_message_id'}
        }
        
        success = EmailService.handle_webhook_event(payload)
        
        self.assertTrue(success)
        self.email.refresh_from_db()
        self.assertEqual(self.email.status, 'delivered')
        self.assertIsNotNone(self.email.delivered_at)

    def test_handle_webhook_opened(self):
        self.email.provider_message_id = 'test_message_id'
        self.email.status = 'delivered'
        self.email.save()
        
        payload = {
            'type': 'email.opened',
            'data': {'email_id': 'test_message_id'}
        }
        
        initial_score = self.lead.score
        
        success = EmailService.handle_webhook_event(payload)
        
        self.assertTrue(success)
        self.email.refresh_from_db()
        self.assertEqual(self.email.status, 'opened')
        self.assertIsNotNone(self.email.opened_at)
        
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.score, initial_score + 5)
