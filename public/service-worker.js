self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Create a new request with the 'Authorization' header
  const modifiedHeaders = new Headers(request.headers);
  const token = localStorage.getItem("token");
  token && modifiedHeaders.set("Authorization", `Bearer ${token}`);

  const modifiedRequest = new Request(request, {
    headers: modifiedHeaders,
  });

  // Handle the request using the modified request object
  event.respondWith(fetch(modifiedRequest));
});
