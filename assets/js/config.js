window.CAMPUS_API = {
  baseUrl: `${location.origin}/api`,
  // "auto" keeps the database-backed API when it is available, and falls back
  // to the browser demo data model on static front-end deployments.
  demoMode: "auto",
  demoStorageKey: "campus_secondhand_demo_v1"
};
