import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from quotes.models import Quote
from quotes.serializers import QuoteSerializer

try:
    quote = Quote.objects.get(id=2)
    data = {
        'deal': quote.deal_id,
        'status': quote.status,
        'amount': float(quote.amount),
        'line_items': [
            {
                'id': item.id, 
                'product': str(item.product_id), # String ID
                'product_name': item.product.name, # Read-only field
                'quantity': item.quantity, 
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total) # Read-only field
            }
            for item in quote.line_items.all()
        ]
    }

    serializer = QuoteSerializer(quote, data=data, partial=True)
    if serializer.is_valid():
        print("Valid!")
    else:
        print("Errors:", serializer.errors)
except Exception as e:
    print("Error:", e)
