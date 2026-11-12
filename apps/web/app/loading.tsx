export default function Loading() {
  // Keep the currently rendered route visible while the next segment resolves.
  // Page-level skeletons reserve their own layout; a global full-screen loader
  // would flash over the whole app during client navigation.
  return null;
}
