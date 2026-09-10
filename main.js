(function() {
    "use strict";

    // ========== 密码门禁 ==========
    const CORRECT_PASSWORD = "nomad2026";
    const overlay = document.getElementById('passwordOverlay');
    const mainContent = document.getElementById('mainContent');
    const passwordInput = document.getElementById('passwordInput');
    const errorMsg = document.getElementById('errorMsg');

    function unlockSite() {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            mainContent.style.display = 'flex';
            document.body.style.background = '#f4f7fc';
        }, 300);
    }

    function handlePassword() {
        const input = passwordInput.value.trim();
        if (input === CORRECT_PASSWORD) {
            unlockSite();
        } else {
            errorMsg.textContent = '密码错误';
            errorMsg.classList.add('shake');
            passwordInput.value = '';
            passwordInput.focus();
            setTimeout(() => {
                errorMsg.classList.remove('shake');
            }, 300);
        }
    }

    passwordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handlePassword();
        }
    });

    passwordInput.focus();

    // ========== 计数器 ==========
    const counterDisplay = document.getElementById('memberCounter');
    const memberCountDisplay = document.getElementById('memberCountDisplay');
    const joinBtn = document.getElementById('joinBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const resetBtn = document.getElementById('resetBtn');

    let currentCount = 12;
    const MIN_COUNT = 0;
    const MAX_COUNT = 99;

    function updateCounter() {
        counterDisplay.textContent = currentCount;
        if (memberCountDisplay) {
            memberCountDisplay.textContent = currentCount;
        }
        counterDisplay.style.transform = 'scale(0.96)';
        setTimeout(() => {
            counterDisplay.style.transform = 'scale(1)';
        }, 80);
    }

    function addMember() {
        if (currentCount < MAX_COUNT) {
            currentCount++;
            updateCounter();
        } else {
            counterDisplay.style.color = '#f0b3b3';
            setTimeout(() => { counterDisplay.style.color = '#d6ecff'; }, 300);
        }
    }

    function removeMember() {
        if (currentCount > MIN_COUNT) {
            currentCount--;
            updateCounter();
        } else {
            counterDisplay.style.color = '#f0b3b3';
            setTimeout(() => { counterDisplay.style.color = '#d6ecff'; }, 300);
        }
    }

    function resetCounter() {
        currentCount = 12;
        updateCounter();
    }

    if (joinBtn) joinBtn.addEventListener('click', addMember);
    if (leaveBtn) leaveBtn.addEventListener('click', removeMember);
    if (resetBtn) resetBtn.addEventListener('click', resetCounter);

    updateCounter();
    console.log('✅ 秘密游牧部落 · 学习小组已启动');
})();