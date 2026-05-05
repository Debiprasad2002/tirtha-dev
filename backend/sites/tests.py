from django.test import TestCase
from django.urls import reverse

from .models import Site


class SiteApiTests(TestCase):
	def test_site_list_returns_sites(self):
		Site.objects.create(name='Ram Mandir', latitude=26.7956, longitude=82.1947)

		response = self.client.get(reverse('site-list'))

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(len(payload), 1)
		self.assertEqual(payload[0]['name'], 'Ram Mandir')
		self.assertEqual(payload[0]['latitude'], 26.7956)
		self.assertEqual(payload[0]['longitude'], 82.1947)
