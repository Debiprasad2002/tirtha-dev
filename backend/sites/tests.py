import tempfile
import io

from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse
from PIL import Image as PILImage

from .models import Mesh, Contributor, Contribution, Image


class SiteApiTests(TestCase):
	def _make_image(self, name='test.png'):
		"""Create a valid test PNG image (1x1 pixel, red)."""
		# Create a real 1x1 PNG image using PIL
		img = PILImage.new('RGB', (1, 1), color='red')
		img_bytes = io.BytesIO()
		img.save(img_bytes, format='PNG')
		img_bytes.seek(0)
		return SimpleUploadedFile(name, img_bytes.read(), content_type='image/png')

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_site_list_returns_sites(self):
		mesh = Mesh.objects.create(
			name='Ram Mandir 1',
			country='India',
			state='Uttar Pradesh',
			district='Mathura',
			preview=self._make_image('ram_prev.png'),
			thumbnail=self._make_image('ram_thumb.png'),
		)

		response = self.client.get(reverse('site-list'))

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(len(payload), 1)
		self.assertEqual(payload[0]['name'], 'Ram Mandir 1')

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_site_stats_returns_contribution_summary(self):
		mesh = Mesh.objects.create(
			name='Ram Mandir 2',
			country='India',
			state='Uttar Pradesh',
			district='Mathura',
			preview=self._make_image('ram_prev.png'),
			thumbnail=self._make_image('ram_thumb.png'),
		)
		contributor1 = Contributor.objects.create(name='Debiprasad', email='debi@example.com', active=True, banned=False)
		contributor2 = Contributor.objects.create(name='User 2', email='user2@example.com', active=True, banned=False)
		contributor3 = Contributor.objects.create(name='User 3', email='user3@example.com', active=True, banned=False)

		contrib1 = Contribution.objects.create(mesh=mesh, contributor=contributor1, processed=True)
		contrib2 = Contribution.objects.create(mesh=mesh, contributor=contributor2, processed=True)
		contrib3 = Contribution.objects.create(mesh=mesh, contributor=contributor3, processed=True)

		# Create images for each contribution
		for idx in range(2):
			Image.objects.create(
				contribution=contrib1,
				image=self._make_image(f'debi_{idx}.png'),
			)
		Image.objects.create(
			contribution=contrib2,
			image=self._make_image('user2.png'),
		)
		for idx in range(3):
			Image.objects.create(
				contribution=contrib3,
				image=self._make_image(f'user3_{idx}.png'),
			)

		response = self.client.get(reverse('site-stats', args=[mesh.ID]))

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload['total_images'], 6)
		self.assertEqual(payload['total_contributors'], 3)
		self.assertEqual(len(payload['top_contributors']), 3)
		self.assertEqual(payload['top_contributors'][0]['name'], 'User 3')
		self.assertEqual(payload['top_contributors'][0]['uploads'], 3)
		self.assertEqual(payload['top_contributors'][1]['name'], 'Debiprasad')
		self.assertEqual(payload['top_contributors'][2]['name'], 'User 2')


class ContributorEmailSignalTests(TestCase):
	@patch('sites.signals.send_contributor_approval_email')
	def test_approval_email_sends_only_when_leaving_pending(self, mock_send_email):
		contributor = Contributor.objects.create(
			name='Debi',
			email='debi@example.com',
			active=False,
			banned=False,
		)

		contributor.active = True
		contributor.save(update_fields=['active'])

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
			active=False,
			banned=False,
		)

		contributor.banned = True
		contributor.save(update_fields=['banned'])

		mock_send_email.assert_called_once_with(contributor)


class ContributionUploadApiTests(TestCase):
	def setUp(self):
		self.mesh = Mesh.objects.create(
			name='Ram Mandir 3',
			country='India',
			state='Uttar Pradesh',
			district='Mathura',
			preview=self._make_image('ram_prev.png'),
			thumbnail=self._make_image('ram_thumb.png'),
		)
		self.contributor = Contributor.objects.create(
			name='Debi',
			email='debi-upload@example.com',
			active=True,
			banned=False,
		)
		session = self.client.session
		session['contributor_email'] = self.contributor.email
		session.save()

	def _make_image(self, name):
		"""Create a valid test PNG image (1x1 pixel, red)."""
		# Create a real 1x1 PNG image using PIL
		img = PILImage.new('RGB', (1, 1), color='red')
		img_bytes = io.BytesIO()
		img.save(img_bytes, format='PNG')
		img_bytes.seek(0)
		return SimpleUploadedFile(name, img_bytes.read(), content_type='image/png')

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_creates_batch_and_images(self):
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.mesh.ID),
				'images': [self._make_image('ram1.png'), self._make_image('ram2.png')],
			},
		)

		self.assertEqual(response.status_code, 201)
		payload = response.json()
		self.assertEqual(payload['status'], 'success')
		self.assertEqual(Contribution.objects.count(), 1)
		contribution = Contribution.objects.get()
		self.assertEqual(contribution.mesh, self.mesh)
		self.assertEqual(contribution.contributor, self.contributor)
		self.assertEqual(Image.objects.filter(contribution=contribution).count(), 2)

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_rejects_banned_contributor(self):
		self.contributor.banned = True
		self.contributor.save(update_fields=['banned'])

		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.mesh.ID),
				'images': [self._make_image('ram1.png')],
			},
		)

		self.assertEqual(response.status_code, 403)
		self.assertEqual(Contribution.objects.count(), 0)
