document.addEventListener("DOMContentLoaded", (event) => {
  const loginButton = document.getElementById("login-button");

  loginButton.addEventListener("click", () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // 这里你可以添加一个发送POST请求到你的服务器的函数，以处理登录逻辑
    console.log("Login button clicked");
    console.log("Username:", username);
    console.log("Password:", password);
  });
});
