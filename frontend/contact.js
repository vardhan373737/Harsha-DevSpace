// Wait until DOM loads
document.addEventListener("DOMContentLoaded", function () {

    // Initialize EmailJS
    emailjs.init("s9myFqQ8sALNg6x8e");

    const form = document.getElementById("contactForm");
    const successMsg = document.getElementById("successMsg");
    const button = form.querySelector(".btn");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        button.innerText = "Sending...";
        button.disabled = true;

        const params = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            message: document.getElementById("message").value
        };

        emailjs.send("service_4ytb2zm", "template_wffdkjf", params)
            .then(function () {

                successMsg.style.display = "block";
                form.reset();

                button.innerText = "Send Message";
                button.disabled = false;

                setTimeout(() => {
                    successMsg.style.display = "none";
                }, 3000);

            })
            .catch(function (error) {

                alert("❌ Failed to send message.");
                console.error("EmailJS Error:", error);

                button.innerText = "Send Message";
                button.disabled = false;

            });
    });

});