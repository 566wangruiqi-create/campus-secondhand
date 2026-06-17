(function () {
  function apiBaseUrl() {
    return window.CAMPUS_API?.baseUrl || "http://localhost:3000/api";
  }

  function currentToken() {
    return localStorage.getItem("campus_token") || "";
  }

  window.apiFetch = async function apiFetch(path, options = {}) {
    const token = currentToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const body = options.body && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body;

    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
      body
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || "接口请求失败");
    }

    return result?.data;
  };
}());
