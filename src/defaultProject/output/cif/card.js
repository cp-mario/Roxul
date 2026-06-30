// External JS for card component
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        const btn = card.querySelector('.card-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                const title = card.querySelector('h2').textContent;
                console.log(`Card button clicked: ${title}`);
                alert(`Your Custom Title hecho clic en la tarjeta: ${title}!`);
            });
        }
    });
    
    // Add hover effect
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
            card.style.transition = 'transform 0.2s ease';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
});