// Wait until DOM loads
document.addEventListener("DOMContentLoaded", function () {

    // Initialize EmailJS fallback channel.
    if (window.emailjs) {
        emailjs.init("s9myFqQ8sALNg6x8e");
    }

    const form = document.getElementById("contactForm");
    const successMsg = document.getElementById("successMsg");
    const errorMsg = document.getElementById("errorMsg");
    const button = form.querySelector(".btn");
    const loadedAtInput = document.getElementById("formLoadedAt");
    const honeypotInput = document.getElementById("website");
    const consentInput = document.getElementById("consent");

    loadedAtInput.value = String(Date.now());
    const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
        successMsg.style.display = "none";
    }

    function clearMessages() {
        errorMsg.style.display = "none";
        errorMsg.textContent = "";
        successMsg.style.display = "none";
    }

    async function sendViaBackend(payload) {
        const response = await fetch("/api/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            const message = data.error || "Unable to send via backend endpoint.";
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    function sendViaEmailJs(params) {
        if (!window.emailjs) {
            return Promise.reject(new Error("Email service is unavailable."));
        }

        return emailjs.send("service_4ytb2zm", "template_wffdkjf", params);
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        clearMessages();

        const now = Date.now();
        const loadedAt = Number(loadedAtInput.value || now);
        const secondsOnForm = (now - loadedAt) / 1000;
        const lastSubmitAt = Number(localStorage.getItem("contact_last_submit") || 0);
        const cooldownMs = 30 * 1000;

        if (honeypotInput.value.trim() !== "") {
            showError("Submission blocked.");
            return;
        }

        if (secondsOnForm < 3) {
            showError("Please take a moment before submitting the form.");
            return;
        }

        if (now - lastSubmitAt < cooldownMs) {
            showError("Please wait a few seconds before sending another message.");
            return;
        }

        const nameValue = document.getElementById("name").value.trim();
        const emailValue = document.getElementById("email").value.trim();
        const phoneValue = document.getElementById("phone").value.trim();
        const messageValue = document.getElementById("message").value.trim();

        if (nameValue.length < 2) {
            showError("Please enter a valid name.");
            return;
        }

        if (messageValue.length < 10) {
            showError("Please enter a message with at least 10 characters.");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailValue)) {
            showError("Please enter a valid email address.");
            return;
        }

        if (phoneValue && !/^[0-9+\-\s()]{7,20}$/.test(phoneValue)) {
            showError("Please enter a valid phone number.");
            return;
        }

        if (!consentInput.checked) {
            showError("Please provide consent before sending your message.");
            return;
        }

        button.innerText = "Sending...";
        button.disabled = true;

        const params = {
            name: nameValue,
            email: emailValue,
            phone: phoneValue,
            message: messageValue
        };

        try {
            await sendViaBackend({
                ...params,
                website: honeypotInput.value,
                formLoadedAt: loadedAtInput.value,
                consent: consentInput.checked
            });
        } catch (backendError) {
            const status = backendError.status;
            const fallbackAllowed = !status || status === 404 || status === 405 || status === 501 || status === 502 || status === 503 || status === 504 || (isLocalDev && status >= 500);

            if (fallbackAllowed) {
                try {
                    await sendViaEmailJs(params);
                } catch (fallbackError) {
                    console.error("Backend Error:", backendError);
                    console.error("EmailJS Error:", fallbackError);
                    showError("Failed to send message. Please try again in a moment.");
                    button.innerText = "Send Message";
                    button.disabled = false;
                    return;
                }
            } else {
                showError(backendError.message || "Failed to send message.");
                button.innerText = "Send Message";
                button.disabled = false;
                return;
            }
        }

        localStorage.setItem("contact_last_submit", String(Date.now()));
        successMsg.style.display = "block";
        form.reset();
        loadedAtInput.value = String(Date.now());
        button.innerText = "Send Message";
        button.disabled = false;

        setTimeout(function () {
            successMsg.style.display = "none";
        }, 3000);
    });

});