import Link from "next/link";
import { StockList } from "@/components/admin";
import { AdminBar } from "@/components/admin-bar";
import { PlusIcon } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { getAllItems, getSettings, priceFor } from "@/lib/data";

export const metadata = { title: "Products & Stock", robots: { index: false } };

export default async function ProductsPage() {
  await requireStaff();
  const [s, items] = await Promise.all([getSettings(), getAllItems()]);
  const prices = Object.fromEntries(items.map((i) => [i.id, priceFor(i, s)?.total ?? null]));
  return (
    <>
      <AdminBar name={s.name} current="/admin/products" />
      <main className="wrap admin">
        <div className="panel-head">
          <h1>Products &amp; Stock</h1>
          <Link href="/admin/item/new" className="btn btn-primary btn-sm">
            <PlusIcon size={18} /> Add Product
          </Link>
        </div>
        <p className="muted">
          One entry per physical piece, with its own weight. New stock of an existing design: use <strong>New Piece</strong>,
          then enter that piece’s weight. After a sale in the store, tap <strong>Mark Sold</strong>.
        </p>
        <section className="panel">
          <StockList items={items} prices={prices} />
        </section>
      </main>
    </>
  );
}
