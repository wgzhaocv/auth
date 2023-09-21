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

document.addEventListener("DOMContentLoaded", (event) => {
  const loginButton = document.getElementById("login-button");
  const passwordEle = document.getElementById("password");
  const passwordlabel = passwordEle.previousElementSibling;
  const sendcodeBtn = document.getElementById("sendcode");
  const switchBtn = document.getElementById("toggle-switch");

  console.log(passwordlabel);

  loginButton.addEventListener("click", async () => {
    const switchValue = document.getElementById("toggle-switch").checked;
    const mailorphone = document.getElementById("mailorphone").value;
    const password = document.getElementById("password").value;
    const identity = identifyString(mailorphone);

    if (!identity) {
      alert("Please enter a valid email or phone number");
      return;
    }

    let data = {};

    if (switchValue) {
      const response = await fetch("/verifyauthcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identity === "Email" ? mailorphone : "",
          phonenumber: identity === "Phone" ? mailorphone : "",
          code: password,
        }),
      });
      data = await response.json();
    } else {
      const response = await fetch("/login", {
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
      data = await response.json();
    }

    if (data.success) {
      window.location.href = data.success.mfaURL;
    } else if (data.error) {
      console.log(data.error);
      alert(data.error.message);
    }
  });

  sendcodeBtn.addEventListener("click", async () => {
    if (sendcodeBtn.classList.contains("disabled") || !switchBtn.checked) {
      alert("Please switch to authcode mode");
      return;
    }
    const mailorphone = document.getElementById("mailorphone").value;
    const identity = identifyString(mailorphone);

    if (!identity) {
      alert("Please enter a valid email or phone number");
      return;
    }

    const response = await fetch("/sendauthcode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: identity === "Email" ? mailorphone : "",
        phonenumber: identity === "Phone" ? mailorphone : "",
      }),
    });
    const data = await response.json();

    if (data.success) {
      alert("Authcode sent");

      sendcodeBtn.disabled = true;
      sendcodeBtn.classList.add("disabled");
      var intervalId = setInterval(function () {
        if (countdown <= 0) {
          clearInterval(intervalId);
          sendcodeBtn.innerText = "send auth code";
          sendcodeBtn.disabled = false;
          sendcodeBtn.classList.remove("disabled");
        } else {
          sendcodeBtn.innerText = `Please wait... (${countdown}s)`;
        }
        countdown--;
      }, 1000);
    } else if (data.error) {
      console.log(data.error);
      alert(data.error.message);
    }
  });

  document
    .getElementById("toggle-switch")
    .addEventListener("change", function () {
      passwordEle.value = "";
      if (this.checked) {
        document.getElementById("label-text").innerText = "login with authcode";
        passwordlabel.innerText = "authcode";
        sendcodeBtn.style.display = "block";
      } else {
        document.getElementById("label-text").innerText = "login with password";
        passwordlabel.innerText = "password";
        sendcodeBtn.style.display = "none";
      }
    });
});
