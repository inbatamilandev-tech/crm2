# Generated manually — adds ActivityLog model and Task outcome/priority/metadata fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0014_task_status_choices_fix'),
    ]

    operations = [
        # -- Task model field updates --
        migrations.AddField(
            model_name='task',
            name='outcome',
            field=models.CharField(
                blank=True,
                choices=[
                    ('success', 'Success'),
                    ('failed', 'Failed'),
                    ('no_response', 'No Response'),
                    ('interested', 'Interested'),
                    ('not_interested', 'Not Interested'),
                ],
                max_length=50,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='metadata',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
        migrations.AlterField(
            model_name='task',
            name='priority',
            field=models.CharField(
                choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
                default='medium',
                max_length=20,
            ),
        ),

        # -- ActivityLog model --
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action_type', models.CharField(
                    choices=[
                        ('status_change', 'Status Change'),
                        ('created', 'Created'),
                        ('updated', 'Updated'),
                        ('completed', 'Completed'),
                        ('outcome_change', 'Outcome Change'),
                    ],
                    max_length=50,
                )),
                ('old_value', models.JSONField(blank=True, default=dict, null=True)),
                ('new_value', models.JSONField(blank=True, default=dict, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('task', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='activity_logs',
                    to='tasks.task',
                )),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
