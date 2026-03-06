import { createBrowserRouter } from "react-router";
import { Layout } from "@/app/components/layout";
import { POSProvider } from "@/app/context/pos-context";
import { DashboardView } from "@/app/components/dashboard-view";
import { NewSalesView } from "@/app/components/new-sales-view";
import { InventoryView } from "@/app/components/inventory-view";
import { ProductManagementView } from "@/app/components/product-management-view";
import { CategoriesView } from "@/app/components/categories-view";
import { PriceManagementView } from "@/app/components/price-management-view";
import { CustomersView } from "@/app/components/customers-view";
import { XeroInvoicesView } from "@/app/components/xero-invoices-view";
import { PurchaseManagementView } from "@/app/components/purchase-management-view";
import { StaffManagementView } from "@/app/components/staff-management-view";
import { ReturnManagementView } from "@/app/components/return-management-view";
import { InvoiceTemplateSettings } from "@/app/components/invoice-template-settings";
import { ReportsView } from "@/app/components/reports-view";
import { StorefrontView } from "@/app/components/storefront-view";
import { WebsiteManagementView } from "@/app/components/website-management-view";
import { WarehouseManagementView } from "@/app/components/warehouse-management-view";
import { ProductShelvingView } from "@/app/components/product-shelving-view";
import { NotFound } from "@/app/components/not-found";
import { CustomerPortal } from "@/app/components/customer-portal";
import { CustomerOrdersView } from "@/app/components/customer-orders-view";
import { StaffPortal } from "@/app/components/staff-portal";
import { UnifiedPortal } from "@/app/components/unified-portal";

// ── Standalone roots (no Layout, own POSProvider) ──────────────────────────

function StorefrontRoot() {
  return (
    <POSProvider>
      <StorefrontView />
    </POSProvider>
  );
}

function PortalRoot() {
  return (
    <POSProvider>
      <UnifiedPortal />
    </POSProvider>
  );
}

function CustomerPortalRoot() {
  return (
    <POSProvider>
      <CustomerPortal />
    </POSProvider>
  );
}

function StaffPortalRoot() {
  return (
    <POSProvider>
      <StaffPortal />
    </POSProvider>
  );
}

// ── Main POS app — Layout wrapped in POSProvider ────────────────────────────
function MainAppRoot() {
  return (
    <POSProvider>
      <Layout />
    </POSProvider>
  );
}

export const router = createBrowserRouter([
  { path: "/storefront",     Component: StorefrontRoot },
  { path: "/portal",         Component: PortalRoot },
  { path: "/customer-portal",Component: CustomerPortalRoot },
  { path: "/staff-portal",   Component: StaffPortalRoot },
  {
    path: "/",
    Component: MainAppRoot,
    children: [
      // All children use Component: (not element:) so React Router
      // always instantiates them inside the live component tree,
      // keeping the POSProvider context intact through Fast Refresh.
      { index: true,                    Component: DashboardView },
      { path: "sales",                  Component: NewSalesView },
      { path: "inventory",              Component: InventoryView },
      { path: "products",               Component: ProductManagementView },
      { path: "categories",             Component: CategoriesView },
      { path: "prices",                 Component: PriceManagementView },
      { path: "purchases",              Component: PurchaseManagementView },
      { path: "customers",              Component: CustomersView },
      { path: "staff",                  Component: StaffManagementView },
      { path: "invoices",               Component: XeroInvoicesView },
      { path: "invoice-templates",      Component: InvoiceTemplateSettings },
      { path: "returns",                Component: ReturnManagementView },
      { path: "reports",                Component: ReportsView },
      { path: "warehouse",              Component: WarehouseManagementView },
      { path: "product-shelving",       Component: ProductShelvingView },
      { path: "website",                Component: WebsiteManagementView },
      { path: "customer-orders",        Component: CustomerOrdersView },
    ],
  },
  { path: "*", Component: NotFound },
]);