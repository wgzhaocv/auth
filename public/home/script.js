console.log("test");

document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById("logout-button");

  const logout = async () => {
    const response = await fetch("/logout");
    const data = await response.json();

    if (data.success) {
      sessionStorage.clear();
      window.location.href = "/login";
    } else if (data.error) {
      console.log(data.error);
      alert(data.error.message);
    }
  };
  logoutButton.addEventListener("click", logout);

  const username = sessionStorage.getItem("username");
  sessionStorage.removeItem("username");
  alert("welcome back " + username);
});
