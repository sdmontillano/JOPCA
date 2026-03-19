// runtime-api-config.js
(function() {
    function getQueryParam(name) {
      try { return new URLSearchParams(window.location.search).get(name); } catch { return null; }
    }
    const apiFromQuery = getQueryParam('api');
    const api = apiFromQuery || window.__DEFAULT_API__ || 'http://127.0.0.1:8000';
    window.__API_BASE__ = api;
    if (window.axios) {
      window.axios.defaults.baseURL = api;
      const token = localStorage.getItem('token');
      if (token) window.axios.defaults.headers.common['Authorization'] = `Token ${token}`;
    }
  })();