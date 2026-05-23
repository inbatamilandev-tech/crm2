from django.contrib import admin
from .models import Deal, Product, Quote, Invoice

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('account', 'value', 'created_at')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price')

@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ('deal', 'total_amount', 'is_accepted', 'created_at')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('deal', 'amount', 'is_paid', 'issued_at')
