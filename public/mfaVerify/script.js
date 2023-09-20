document.addEventListener("DOMContentLoaded", () => {
  const cancelBtn = document.getElementById("cancelBtn");
  const comfirmBtn = document.getElementById("comfirmBtn");
  const authCode = document.getElementById("authCode");
  authCode.focus();

  cancelBtn.addEventListener("click", () => {
    window.history.back();
  });

  comfirmBtn.addEventListener("click", async () => {
    const authCodeValue = authCode.value;
    if (!authCodeValue) return;
    if (/^\d{6}$/.test(authCodeValue)) {
      const response = await fetch("/mfa/verify" + window.location.search, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mfaCode: authCodeValue,
        }),
      });
      data = await response.json();
      if (data.success) {
        sessionStorage.setItem("username", data.success.data.user);
        window.location.href = data.success.redirectTo ?? "/";
      } else {
        alert(data.error.message);
      }
    } else {
      alert("input 6 digits");
    }
  });
});
