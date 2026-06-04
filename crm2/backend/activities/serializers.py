from rest_framework import serializers
from .models import Activity, Meeting, Call, Comment, Mention
from django.contrib.auth import get_user_model

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'avatar')


class MentionSerializer(serializers.ModelSerializer):
    user_details = UserMinimalSerializer(source='user', read_only=True)
    
    class Meta:
        model = Mention
        fields = ('id', 'user', 'user_details', 'created_at')


class CommentSerializer(serializers.ModelSerializer):
    user_details = UserMinimalSerializer(source='user', read_only=True)
    mentions = MentionSerializer(many=True, read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = (
            'id', 'user', 'user_details', 'text', 'content_type', 'object_id', 
            'parent', 'replies', 'mentions', 'is_internal', 'created_at', 'updated_at'
        )
        read_only_fields = ('user', 'created_at', 'updated_at')

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True).data
        return []

class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = '__all__'

class MeetingSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    type = serializers.ReadOnlyField()

    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'date', 'time', 'type', 'meeting_type', 
            'start_time', 'end_time', 'status', 'notes', 'participants',
            'object_id', 'content_type', 'owner', 'created_at'
        ]
        read_only_fields = ['owner', 'created_at']

    def get_date(self, obj):
        from django.utils import timezone
        return timezone.localtime(obj.start_time).strftime('%Y-%m-%d') if obj.start_time else None

    def get_time(self, obj):
        from django.utils import timezone
        return timezone.localtime(obj.start_time).strftime('%H:%M') if obj.start_time else None

class CallSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = Call
        fields = '__all__'
        read_only_fields = ['owner', 'created_at']
