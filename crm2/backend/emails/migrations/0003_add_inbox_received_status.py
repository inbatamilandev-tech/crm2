# Generated manually to add inbox/received status choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('emails', '0002_emailtemplate'),
    ]

    operations = [
        migrations.AlterField(
            model_name='email',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('queued', 'Queued'),
                    ('sent', 'Sent'),
                    ('delivered', 'Delivered'),
                    ('opened', 'Opened'),
                    ('clicked', 'Clicked'),
                    ('bounced', 'Bounced'),
                    ('failed', 'Failed'),
                    ('inbox', 'Inbox'),
                    ('received', 'Received'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
    ]
