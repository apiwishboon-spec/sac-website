// Cart Management
export const cart = {
    items: JSON.parse(localStorage.getItem('sac_cart')) || [],

    add(product) {
        const existing = this.items.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({ ...product, quantity: 1 });
        }
        this.save();
        this.updateUI();
    },

    remove(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        this.updateUI();
    },

    updateQuantity(productId, delta) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) this.remove(productId);
            else {
                this.save();
                this.updateUI();
            }
        }
    },

    save() {
        localStorage.setItem('sac_cart', JSON.stringify(this.items));
    },

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    updateUI() {
        const countElement = document.getElementById('cart-count');
        if (countElement) {
            countElement.textContent = this.items.reduce((sum, item) => sum + item.quantity, 0);
        }

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: this.items }));
    }
};

// Initialize UI count
document.addEventListener('DOMContentLoaded', () => cart.updateUI());
