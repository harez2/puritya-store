
## Summary Statistic Tiles for Customers Page

We will add a row of summary statistic cards at the top of the **Admin Customers** page to give you a quick, high-level overview of your customer base.

### What will be added:
1.  **Total Customers**: The total number of unique customers (both registered and guest).
2.  **Registered Customers**: The number of customers who have created an account.
3.  **Guest Customers**: The number of unique phone numbers that have placed guest orders without creating an account.
4.  **Average Lifetime Value (LTV)**: The average amount spent per customer across your entire store.

### Implementation Details:
*   **Component Usage**: We will utilize your existing `StatCard` component (`src/components/admin/StatCard.tsx`) to keep the design consistent with the rest of the admin dashboard.
*   **Calculations**: The metrics will be dynamically computed from the `customers` state array already loaded on the page.
*   **Placement**: The cards will be displayed in a responsive grid layout (1 column on mobile, 2 on tablets, 4 on desktop) positioned immediately below the "Customers" header and export button, but above the tabs and customer list.
*   **Icons**: We will import relevant icons (`Users`, `UserCheck`, `UserMinus`, `CreditCard`) from `lucide-react` to visually represent each statistic.
