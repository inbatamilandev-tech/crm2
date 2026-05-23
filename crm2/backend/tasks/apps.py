from django.apps import AppConfig


class TasksConfig(AppConfig):
    name = 'tasks'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import tasks.signals  # noqa: F401 — registers signal handlers
