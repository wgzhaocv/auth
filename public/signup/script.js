document.addEventListener("DOMContentLoaded", (event) => {
  const registerButton = document.getElementById("register-button");

  function identifyString(str) {
    const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    const phonePattern = /^\d+$/;

    if (emailPattern.test(str)) {
      return "Email";
    } else if (phonePattern.test(str)) {
      return "Phone";
    } else {
      return "";
    }
  }

  registerButton.addEventListener("click", async () => {
    const mailorphone = document.getElementById("mailorphone").value;
    const password = document.getElementById("password").value;

    // 这里你可以添加一个发送POST请求到你的服务器的函数，以处理登录逻辑
    console.log("Login button clicked");
    console.log("mailorphone", mailorphone);
    console.log("Password:", password);

    const identity = identifyString(mailorphone);
    if (!identity) {
      alert("Please enter a valid email or phone number");
      return;
    }

    const data = await fetch("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: identity === "Email" ? mailorphone : "",
        phonenumber: identity === "Phone" ? mailorphone : "",
        password: password,
      }),
    });

    if (data.success) {
      sessionStorage.setItem("username", data.success.data.user);
      if (data.success.redirectTo) {
        window.location.href = data.success.redirectTo;
      } else {
        window.location.href = "/";
      }
    } else if (data.error) {
      console.log(data.error);
      alert(data.error.message);
    }
  });
});
