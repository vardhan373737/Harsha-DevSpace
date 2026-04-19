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
    const bestForInput = document.getElementById("bestFor");
    const messageInput = document.getElementById("message");
    const nameInput = document.getElementById("name");

    function getSenderName() {
        const value = nameInput ? nameInput.value.trim() : "";
        return value.length >= 2 ? value : "a candidate";
    }

    function buildPrefillTemplate(type) {
        const senderName = getSenderName();

        if (type === "internship") {
            return "Hi, I am " + senderName + ". I am reaching out regarding an internship opportunity.\nRole details:\nStart date:\nExpected responsibilities:\n";
        }

        if (type === "freelance") {
            return "Hi, I am " + senderName + ". I would like to discuss a freelance project.\nProject goal:\nTimeline:\nBudget range:\n";
        }

        if (type === "fulltime") {
            return "Hi, I am " + senderName + ". I am contacting you about a full-time role.\nRole title:\nCompany:\nTech stack expectations:\n";
        }

        if (type === "collaboration") {
            return "Hi, I am " + senderName + ". I would like to explore a collaboration.\nProduct idea:\nScope of collaboration:\nPreferred timeline:\n";
        }

        return "";
    }

    const bestForLabels = {
        internship: "Internship Opportunity",
        freelance: "Freelance Project",
        fulltime: "Full-time Role",
        collaboration: "Product Collaboration"
    };

    let lastAppliedTemplate = "";

    loadedAtInput.value = String(Date.now());
    const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
        successMsg.style.display = "none";
        window.alert(message);
    }

    function clearMessages() {
        errorMsg.style.display = "none";
        errorMsg.textContent = "";
        successMsg.style.display = "none";
    }

    function normalizeMessageLineBreaks(text) {
        return String(text || "").replace(/\\r?\\n/g, "\n").trim();
    }

    function looksSpammy(message) {
        const lowered = message.toLowerCase();
        const spamTerms = ["crypto", "forex", "casino", "betting", "loan", "airdrop", "http://", "https://", "whatsapp"];
        let termHits = 0;

        spamTerms.forEach(function (term) {
            if (lowered.indexOf(term) !== -1) {
                termHits += 1;
            }
        });

        const urlMatches = message.match(/https?:\/\//gi);
        const urlCount = urlMatches ? urlMatches.length : 0;

        return termHits >= 2 || urlCount > 1;
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

    if (bestForInput && messageInput) {
        bestForInput.addEventListener("change", function () {
            const selectedValue = bestForInput.value;
            const template = buildPrefillTemplate(selectedValue);

            if (!template) {
                lastAppliedTemplate = "";
                return;
            }

            const currentMessage = messageInput.value.trim();
            const canReplace = currentMessage === "" || currentMessage === lastAppliedTemplate.trim();

            if (canReplace) {
                messageInput.value = template;
                lastAppliedTemplate = template;
            }
        });
    }

    if (nameInput && bestForInput && messageInput) {
        nameInput.addEventListener("input", function () {
            const selectedValue = bestForInput.value;
            if (!selectedValue) {
                return;
            }

            const currentMessage = messageInput.value.trim();
            const canReplace = currentMessage === "" || currentMessage === lastAppliedTemplate.trim();

            if (canReplace) {
                const template = buildPrefillTemplate(selectedValue);
                messageInput.value = template;
                lastAppliedTemplate = template;
            }
        });
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        clearMessages();

        const now = Date.now();
        const loadedAt = Number(loadedAtInput.value || now);
        const secondsOnForm = (now - loadedAt) / 1000;
        const lastSubmitAt = Number(localStorage.getItem("contact_last_submit") || 0);
        const cooldownMs = 60 * 1000;

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
        const messageValue = normalizeMessageLineBreaks(messageInput.value);
        const bestForValue = bestForInput ? bestForInput.value : "";
        const bestForLabel = bestForLabels[bestForValue] || "";

        if (!bestForValue || !bestForLabel) {
            showError("Please select what this inquiry is best for.");
            return;
        }

        if (nameValue.length < 2) {
            showError("Please enter a valid name.");
            return;
        }

        if (messageValue.length < 25) {
            showError("Please enter a message with at least 25 characters.");
            return;
        }

        if (messageValue.length > 1200) {
            showError("Please keep your message under 1200 characters.");
            return;
        }

        if (looksSpammy(messageValue)) {
            showError("Please remove promotional or spam-like content and try again.");
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
            message: messageValue,
            bestFor: bestForValue,
            bestForLabel: bestForLabel
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
        window.alert("Message sent successfully!");
        form.reset();
        loadedAtInput.value = String(Date.now());
        button.innerText = "Send Message";
        button.disabled = false;

        setTimeout(function () {
            successMsg.style.display = "none";
        }, 3000);
    });

});