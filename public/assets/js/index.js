// put this near your other globals
let isProcessingScan = false;
let lastCode = null;
// ===================
// Login/logout (optional)
// ===================
window.onload = function () {
  const idInput = document.getElementById("id");
  const passwordInput = document.getElementById("password");
  if (idInput) idInput.value = "";
  if (passwordInput) passwordInput.value = "";
};

function onSubmit(e) {
  e.preventDefault();
  window.location.href = "dashboard.html";
}

function logout() {
  window.location.href = "index.html";
}

// ===================
// Popup + Voiceover
// ===================
let selectedVoice = null;

function pickVoice(voices) {
  const byName = (n) => voices.find((v) => v.name?.toLowerCase().includes(n));
  return (
    byName("samantha") ||
    byName("victoria") ||
    voices.find(
      (v) =>
        v.lang === "en-US" &&
        !/alex|fred|daniel|arthur|male/i.test(v.name || "")
    ) ||
    voices.find((v) => v.lang?.startsWith("en")) ||
    voices[0] ||
    null
  );
}

function loadVoicesOnce() {
  const voices = speechSynthesis.getVoices();
  if (voices && voices.length) {
    selectedVoice = pickVoice(voices);
    return true;
  }
  return false;
}

async function ensureVoices() {
  if (loadVoicesOnce()) return;
  await new Promise((resolve) => {
    const handler = () => {
      if (loadVoicesOnce()) {
        speechSynthesis.onvoiceschanged = null;
        resolve();
      }
    };
    speechSynthesis.onvoiceschanged = handler;
    setTimeout(handler, 1500);
  });
}

async function speakMessage(message, isFast) {
  await ensureVoices();
  const u = new SpeechSynthesisUtterance(message);
  if (selectedVoice) u.voice = selectedVoice;
  u.rate = 0.7;
  u.lang = "en-US";
  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(u), 0);
}

function showPopup(gameSeq) {
  const title = document.getElementById("popup-title");
  const text = document.getElementById("popup-text");
  const popup = document.getElementById("popup");

  const bodyTag = document.querySelector("body");
  bodyTag.style.overflow  = "hidden";
  // const message =
  //   {
  //     "Slot Machine": "Click the spin button and match three symbols to win!",
  //     Roulette: "Place a bet on a number or colour, then spin the wheel.",
  //     Blackjack: "Try to reach twenty-one without going over. Beat the dealer!",
  //     "Lucky Spin": "Spin the wheel and try your luck for instant prizes!",
  //   }[game] || "No instructions available.";

  const message = [
    {
      title: "Chasing Fortune",
      desc: "You will play 5 matches for this game. Each group begins with 5 tokens, and each draw costs 1 token. If you draw a WIN card, you get back your original token plus one extra. If you draw a LOSE card, you lose 1 token. If you draw a NEARLY WIN card, you only get back your original token. If you draw a BIG WIN card, you get back your original token plus two extra.",
    },
    {
      title: "Bet your way out",
      desc: "Each team draws five cards, and the team with the higher total wins the round. The game will be played in three rounds, and the team that wins two rounds first will be the winner. The losing team MUST give the winning team 8 tokens. Then, the winning team will move on to Activity 3, while the losing team will move directly to Activity 4.",
    },
    {
      title: "Double it or Lose it All",
      desc: "Congratulations you have made it this far!\nNow‘s your chance to double however much token you have in hand.\n\nYou have 1 chance to press the buzzers.\n\n2 of 3 of the buzzers are “DOUBLE IT ALL” and one is “ LOSE IT ALL “\n\nYou win when you hear “ DOUBLE IT ALL” and lose all your money if you hear “ LOSE IT ALL. ",
    },
    {
      title: "From Curiosity To Collapse",
      desc: "Rearrange the events in the right order using the clues you have. After that, show it to the PIC.",
    },
  ];
  title.innerText = `${message[gameSeq].title} Instructions`;
  text.innerText = message[gameSeq].desc;
  popup.style.display = "flex";
  // speakMessage(message); // runs after a user click
}

function closePopup(isNpc) {
  const bodyTag = document.querySelector("body");
  bodyTag.style.overflow  = "auto";
  document.getElementById(isNpc ? "popup-npc" : "popup").style.display = "none";
  speechSynthesis.cancel();
}

// ===================
// Screen switching (Dashboard <-> QR)
// ===================
const dashboardEl = document.getElementById("dashboard");
const qrScreenEl = document.getElementById("qr-screen");

document.querySelectorAll(".nav-qr").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    openQR();
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("qrBackBtn");
  if (btn) btn.addEventListener("click", closeQR);
});

function openQR() {
  dashboardEl.style.display = "none";
  qrScreenEl.style.display = "block";
  startCamera(); // auto-start
}

function closeQR() {
  stopCamera();
  qrScreenEl.style.display = "none";
  dashboardEl.style.display = "block";
  window.location.href = "/dashboard.html";
}

// ===================
// QR Scanner
// ===================
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const pickBtn = document.getElementById("pickBtn");
const fileInput = document.getElementById("fileInput");
const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const textEl = document.getElementById("qrText");

let stream = null;
let rafId = null;

function drawBox(ctx, loc) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = "lime";
  ctx.beginPath();
  ctx.moveTo(loc.topLeftCorner.x, loc.topLeftCorner.y);
  ctx.lineTo(loc.topRightCorner.x, loc.topRightCorner.y);
  ctx.lineTo(loc.bottomRightCorner.x, loc.bottomRightCorner.y);
  ctx.lineTo(loc.bottomLeftCorner.x, loc.bottomLeftCorner.y);
  ctx.closePath();
  ctx.stroke();
}
function getScanWindowRect(videoEl) {
  const vw = videoEl.videoWidth | 0,
    vh = videoEl.videoHeight | 0;
  if (vw <= 0 || vh <= 0) return { ok: false };
  const size = Math.max(40, Math.floor(Math.min(vw, vh) * 0.7));
  let x = Math.floor((vw - size) / 2);
  let y = Math.floor((vh - size) / 2 - vh * 0.03);
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + size > vw) x = vw - size;
  if (y + size > vh) y = vh - size;
  return { ok: true, x, y, size, vw, vh };
}

function safeGetImageData(ctx, x, y, w, h) {
  if (!ctx || w <= 0 || h <= 0 || !isFinite(x + y + w + h)) return null;
  try {
    return ctx.getImageData(x, y, w, h);
  } catch {
    return null;
  }
}
async function startCamera() {
  stopCamera(); // cleanup if already running
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    video.srcObject = stream;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    await new Promise((res) => {
      if (video.readyState >= 2) return res();
      video.onloadedmetadata = () => res();
    });

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    scanLoop();
  } catch (err) {
    console.error(err);
    alert("Camera access failed. Allow permission or use Scan from Photo.");
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

function stopCamera() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

function scanLoop() {
  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d", { willReadFrequently: true });

  let last = 0;
  const DECODE_MS = 140;

  const tick = (t) => {
    if (!stream) return;

    const rect = getScanWindowRect(video);
    if (!rect.ok) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    // keep offscreen canvas in sync with video size
    if (off.width !== rect.vw || off.height !== rect.vh) {
      off.width = rect.vw;
      off.height = rect.vh;
    }

    if (!last || t - last >= DECODE_MS) {
      last = t || performance.now();

      // draw frame then crop safely
      offCtx.drawImage(video, 0, 0, off.width, off.height);
      const img = safeGetImageData(
        offCtx,
        rect.x,
        rect.y,
        rect.size,
        rect.size
      );

      if (img && img.width && img.height && img.data && img.data.length) {
        let code = null;
        try {
          code = jsQR(img.data, img.width, img.height, {
            inversionAttempts: "dontInvert",
          });
          if (!code)
            code = jsQR(img.data, img.width, img.height, {
              inversionAttempts: "onlyInvert",
            });
          if (code) {
            // Show loading
            document.body.innerHTML += `
          <div id="loadingOverlay" style="
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            color: white;
            font-size: 18px;
            z-index: 9999;
          ">
            <div class="loader" style="
              border: 4px solid #f3f3f3;
              border-top: 4px solid limegreen;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 2s linear infinite;
              margin-bottom: 15px;
            "></div>
            Loading...
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        `;

            // Redirect after 2 seconds
            setTimeout(() => {
              const payment = sessionStorage.getItem("payment") || 0;
              window.location.href = `success.html`; // Change to your success page
            }, 2000);
          }
        } catch (e) {
          // skip bad frame; don't crash
          // console.debug("jsQR skipped:", e?.message || e);
        }

        if (code && code.data) {
          // ignore same value if seen in the last 1.5s (optional)
          if (code.data === lastCode) return;
          lastCode = code.data;

          // lock so we don't process again
          isProcessingScan = true;

          // Extract an amount (handles "50", "RM50", "pay=50.25", etc.)
          const m = String(code.data).match(/([0-9]+(?:\.[0-9]{1,2})?)/);
          const amount = m ? parseFloat(m[1]) : NaN;
          const isDeduct = m.input.includes("-");
          if (!isNaN(amount)) {
            const balanceEl = document.querySelector("#balance-display");
            if (balanceEl) {
              const current =
                parseFloat(balanceEl.textContent.replace(/[^\d.]/g, "")) || 0;
              const next = isDeduct
                ? Math.max(0, current - amount)
                : Math.max(0, current + amount); // clamp at 0 if you want
              balanceEl.textContent = next;
              // persist so success.html can show it
              localStorage.setItem("balance", balanceEl.textContent);
              sessionStorage.setItem("payment", m.input);
            }
          }

          // stop everything so the loop can't run again
          stopCamera();

          // optional loading overlay, then redirect
          showLoadingAndRedirect("#success"); // or setTimeout(() => location.href="success.html", 800);
        }
      }
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}
function showLoadingAndRedirect(url, delayMs = 1200) {
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,.85);
    display:flex; align-items:center; justify-content:center; flex-direction:column;
    color:#fff; font-size:18px; z-index:9999;
  `;
  el.innerHTML = `
    <div style="width:42px;height:42px;border-radius:50%;
      border:4px solid rgba(255,255,255,.3); border-top-color:#3cf37c;
      animation:spin 1s linear infinite; margin-bottom:14px;"></div>
    Processing...
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    window.location.href = url;
  }, delayMs);
}
// Buttons
startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
pickBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const can = document.createElement("canvas");
    can.width = img.width;
    can.height = img.height;
    const ctx = can.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, can.width, can.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height);
    textEl.textContent = code ? code.data : "No QR found in image.";
  };
  img.src = URL.createObjectURL(file);
});

// Pause camera if tab/app goes background
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});

function showPopupNPC(gameSeq, isMoveStep) {
  const popup = document.getElementById("popup-npc");
  const popupContainer = document.getElementById("popup-container-npc");
  const bodyTag = document.querySelector("body");
  bodyTag.style.overflow  = "hidden";
  const message = [
    {
      title: "Chasing Fortune",
      desc1:
        "Each group begins with 5 tokens, and each draw costs 1 token.\n\nIf you draw a WIN card, you get back your original token plus one extra (+1 token).\nIf you draw a LOSE card, you lose 1 token (–1 token).\n\nIf you draw a NEARLY WIN card, you only get back your original token (0 token).\n\nIf you draw a BIG WIN card, you get back your original token plus two extra (+2 tokens).\n",
      desc2: "Congratulations, now please move to the next station.",
      pic: "./assets/images/step1-instruct.jpeg",
    },
    {
      title: "Bet your way out",
      desc1:
        "Each team draws five cards, and the team with the higher total wins the round. The game will be played in three rounds, and the team that wins two rounds first will be the winner. The losing team MUST give the winning team 8 tokens. Then, the winning team will move on to Activity 3, while the losing team will move directly to Activity 4.",
      desc2:
        "Now, the winning team move to the right side, while the losing team move to the left side.",
      pic: "./assets/images/step2-instruct.jpeg",
    },
    {
      title: "Double it or Lose it All",
      desc1: `Congratulations you have made it this far!
Now‘s your chance to double however much token you have in hand.
You have 1 chance to press the buzzers. 
2 of 3 of the buzzers are “DOUBLE IT ALL” and one is “ LOSE IT ALL “   
You win when you hear “ DOUBLE IT ALL” and lose all your money if you hear “ LOSE IT ALL. `,
      desc2:
        "Ohhhhh, unfortunately you have lose all your tokens, now move to the last station.",
      pic: "./assets/images/step3-instruct.jpeg",
    },
    {
      title: "From Curiosity To Collapse",
      desc1:
        "Rearrange the events in the right order using the clues you have. After that, show it to the PIC.",
      desc2: "",
      pic: "./assets/images/step4-instruct.jpeg",
    },
  ];

  const showMessage = !isMoveStep
    ? message[gameSeq].desc1
    : message[gameSeq].desc2;
  const showTitle = !isMoveStep ? `${message[gameSeq].title} Instructions` : "";
  // switch (gameSeq) {
  //   case 0:
  //     popupContainer.innerHTML = `<div class="img-container">
  //         <img id="popup-game-img" src="${message[gameSeq].pic}" />
  //       </div>
  //       <div class="npc-desc">
  //         <h2 id="popup-npc-title">${showTitle}</h2>
  //         <h5 id="popup-npc-text">${showMessage}</h5>
  //       </div>`;
  //     break;
  //   // case 1:
  //   //   popupContainer.innerHTML = `<div class="img-container">
  //   //       <img id="popup-game-img" src="${message[gameSeq].pic}" />
  //   //     </div>
  //   //     <div class="npc-desc">
  //   //       <h2 id="popup-npc-title">${showTitle}</h2>
  //   //       <h5 id="popup-npc-text">${showMessage}</h5>
  //   //     </div>`;
  //   //   break;
  //   // case 2:
  //   //   popupContainer.innerHTML = `
  //   //         <div class="img-container">
  //   //           <img id="popup-game-img" src="${message[gameSeq].pic}" />
  //   //         </div>
  //   //         <div class="npc-desc">
  //   //           <h5 id="popup-npc-text">${showMessage}</h5>
  //   //         </div>`;
  //   //   break;
  //   default:
  //     popupContainer.innerHTML = "";
  // }
  popupContainer.innerHTML = `<div class="img-container">
          <img id="popup-game-img" src="${message[gameSeq].pic}" />
        </div>
        <div class="npc-desc">
          <h2 id="popup-npc-title">${showTitle}</h2>
          <h5 id="popup-npc-text">${showMessage}</h5>
        </div>`;

  popup.style.display = "flex";

  speakMessage(showMessage); // runs after a user click
}
