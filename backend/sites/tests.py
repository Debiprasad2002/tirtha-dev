from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from .models import Site, Contributor


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


class ContributorEmailSignalTests(TestCase):
	@patch('sites.signals.send_contributor_approval_email')
	def test_approval_email_sends_only_when_leaving_pending(self, mock_send_email):
		contributor = Contributor.objects.create(
			name='Debi',
			email='debi@example.com',
			is_active=False,
			is_banned=False,
		)

		contributor.is_active = True
		contributor.save(update_fields=['is_active'])

		mock_send_email.assert_called_once_with(contributor)

		mock_send_email.reset_mock()
		contributor.name = 'Debi Prasad'
		contributor.save(update_fields=['name'])
		mock_send_email.assert_not_called()

	@patch('sites.signals.send_contributor_rejection_email')
	def test_rejection_email_sends_only_when_leaving_pending(self, mock_send_email):
		contributor = Contributor.objects.create(
			name='Debi',
			email='debi2@example.com',
			is_active=False,
			is_banned=False,
		)

		contributor.is_banned = True
		contributor.save(update_fields=['is_banned'])

		mock_send_email.assert_called_once_with(contributor)
