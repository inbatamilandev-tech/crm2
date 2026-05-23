from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, UserDetailView, CompanyProfileView, ChangePasswordView, CustomTokenObtainPairView

urlpatterns = [
    path('register/',       RegisterView.as_view(),      name='register'),
    path('company-profile/', CompanyProfileView.as_view(), name='company_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('login/',          CustomTokenObtainPairView.as_view(), name='login'),
    path('token/',          CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('token/refresh/',  TokenRefreshView.as_view(),  name='token_refresh'),
    path('me/',             UserDetailView.as_view(),    name='user_detail'),
]
