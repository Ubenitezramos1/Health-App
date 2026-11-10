import { type Href, router } from 'expo-router';

/** Go back if there is a screen to return to (deep links and web refreshes have none). */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
