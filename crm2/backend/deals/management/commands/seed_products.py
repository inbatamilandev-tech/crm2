from django.core.management.base import BaseCommand
from deals.models import Product

class Command(BaseCommand):
    help = 'Seed example products and services'

    def handle(self, *args, **options):
        products = [
            {
                'name': 'Business Website',
                'sku': 'WEB-BUS',
                'category': 'web_dev',
                'service_type': 'website_package',
                'price': 1500.00,
                'description': 'A professional business website with up to 5 pages.',
                'estimated_timeline': '2 weeks',
            },
            {
                'name': 'Ecommerce Website',
                'sku': 'WEB-ECOM',
                'category': 'web_dev',
                'service_type': 'website_package',
                'price': 3500.00,
                'description': 'Full-featured online store with payment gateway integration.',
                'estimated_timeline': '4 weeks',
            },
            {
                'name': 'CRM Software',
                'sku': 'SFT-CRM',
                'category': 'software',
                'service_type': 'software_package',
                'price': 5000.00,
                'description': 'Custom CRM solution tailored to business needs.',
                'estimated_timeline': '6 weeks',
            },
            {
                'name': 'SEO Optimization',
                'sku': 'MKT-SEO',
                'category': 'seo',
                'service_type': 'service',
                'price': 500.00,
                'description': 'Monthly SEO optimization and reporting.',
                'estimated_timeline': 'Monthly',
            },
            {
                'name': 'Hosting Package',
                'sku': 'HST-BAS',
                'category': 'hosting',
                'service_type': 'subscription',
                'price': 50.00,
                'description': 'Basic hosting with SSL and daily backups.',
                'estimated_timeline': 'Monthly',
            },
            {
                'name': 'Mobile App Development',
                'sku': 'APP-MOB',
                'category': 'software',
                'service_type': 'software_package',
                'price': 8000.00,
                'description': 'Native or cross-platform mobile app development.',
                'estimated_timeline': '8 weeks',
            },
        ]

        for prod_data in products:
            Product.objects.get_or_create(sku=prod_data['sku'], defaults=prod_data)
            self.stdout.write(self.style.SUCCESS(f"Seeded product: {prod_data['name']}"))
