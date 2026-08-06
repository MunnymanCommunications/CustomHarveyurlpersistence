/**
 * Everything this site can be configured to do, in one place.
 */

/**
 * Where visitors talk to Harvey. This site does not host the assistant — it
 * points at the main app, which does.
 *
 * Every `#/public/<id>` path opened here is replaced with this URL. That covers
 * the link already in circulation, whose id came from a previous deployment and
 * no longer resolves anywhere, and it covers any other retired id nobody wrote
 * down — which is why the route redirects rather than a list of known ids.
 *
 * Hard-coded rather than read from the environment on purpose: a redirect that
 * only works when a deploy remembers to set a variable is one that quietly
 * stops working, and the people holding the old link can't be told to retry.
 */
export const ASSISTANT_URL =
  'https://harvey.thenexusai.app/#/public/69926ca8-2033-4828-8fd5-fe67524f5823';

/** Upgrade enquiries are handled by a person, not a checkout flow. */
const UPGRADE_EMAIL = 'Nick@munnymancommunications.com';
const UPGRADE_SUBJECT = "I'd like to upgrade to a paid subscription";
const UPGRADE_BODY = [
  'Hi Nick,',
  '',
  "I'd like to upgrade to a paid subscription.",
  '',
  'Name:',
  'Company:',
  'Best number to reach me:',
].join('\n');

export const UPGRADE_MAILTO =
  `mailto:${UPGRADE_EMAIL}` +
  `?subject=${encodeURIComponent(UPGRADE_SUBJECT)}` +
  `&body=${encodeURIComponent(UPGRADE_BODY)}`;
