(function() {
    "use strict";

    // DOM 元素
    const counterDisplay = document.getElementById('memberCounter');
    const memberCountDisplay = document.getElementById('memberCountDisplay');
    const joinBtn = document.getElementById('joinBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 状态
    let currentCount = 12;
    const MIN_COUNT = 0;
    const MAX_COUNT = 99;

    // 更新所有显示
    function updateCounter() {
        counterDisplay.textContent = currentCount;
        if (memberCountDisplay) {
            memberCountDisplay.textContent = currentCount;
        }
        // 微小的视觉反馈
        counterDisplay.style.transform = 'scale(0.96)';
        setTimeout(() => {
            counterDisplay.style.transform = 'scale(1)';
        }, 80);
    }

    // 加入成员
    function addMember() {
        if (currentCount < MAX_COUNT) {
            currentCount++;
            updateCounter();
        } else {
            counterDisplay.style.color = '#f0b3b3';
            setTimeout(() => { counterDisplay.style.color = '#d6ecff'; }, 300);
        }
    }

    // 离开成员
    function removeMember() {
        if (currentCount > MIN_COUNT) {
            currentCount--;
            updateCounter();
        } else {
            counterDisplay.style.color = '#f0b3b3';
            setTimeout(() => { counterDisplay.style.color = '#d6ecff'; }, 300);
        }
    }

    // 重置到初始值
    function resetCounter() {
        currentCount = 12;
        updateCounter();
    }

    // 绑定事件
    if (joinBtn) joinBtn.addEventListener('click', addMember);
    if (leaveBtn) leaveBtn.addEventListener('click', removeMember);
    if (resetBtn) resetBtn.addEventListener('click', resetCounter);

    // 初始化
    updateCounter();
    console.log('✅ 秘密游牧部落 · 学习小组已启动');
})();