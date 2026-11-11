import { feedbackMailto, rateUrl } from '../brand';

describe('rateUrl', () => {
  it('opens the review page in each store app', () => {
    expect(rateUrl('ios')).toBe('itms-apps://apps.apple.com/app/id6826843084?action=write-review');
    expect(rateUrl('android')).toBe('market://details?id=org.oursome.app');
  });

  it('picks the right store on the web', () => {
    expect(rateUrl('web', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toContain('apps.apple.com');
    expect(rateUrl('web', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toContain('play.google.com');
  });
});

describe('feedbackMailto', () => {
  it('writes to support with the version in the subject', () => {
    const url = feedbackMailto('1.0.3', 'android');
    expect(url.startsWith('mailto:oursomeapp@outlook.com?subject=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Oursome feedback (1.0.3, android)');
  });
});
