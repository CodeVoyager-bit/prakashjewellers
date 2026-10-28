import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/admin";
import { AdminBar } from "@/components/admin-bar";
import { BackIcon, CopyIcon } from "@/components/icons";
import { ConfirmForm } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getCategories, getItem, getSettings } from "@/lib/data";
import { deleteItem, duplicateItem, setStatus } from "../../actions";

export const metadata = { title: "Product", robots: { index: false } };

export default async function EditItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ copied?: string }> }) {
  await requireStaff();
  const [{ id }, { copied }] = await Promise.all([params, searchParams]);
  const [item, categories, s] = await Promise.all([id === "new" ? null : getItem(id), getCategories(true), getSettings()]);
  if (id !== "new" && !item) notFound();

  return (
    <>
      <AdminBar name={s.name} current="/admin/products" />
      <main className="wrap admin">
        <Link href="/admin/products" className="back">
          <BackIcon size={18} /> Products &amp; Stock
        </Link>
        <h1>{item ? `Edit ${item.name}` : "Add Product"}</h1>
        <ItemForm item={item} categories={categories} rates={s.rates} makingPct={s.makingPct} taxPct={s.taxPct} copied={!!copied} />
        {item && (
          <div className="editor-actions">
            <form action={duplicateItem.bind(null, item.id)}>
              <button type="submit" className="btn btn-quiet">
                <CopyIcon size={18} /> New Piece of This Design
              </button>
            </form>
            <form action={setStatus.bind(null, item.id, item.status === "archived" ? "draft" : "archived")}>
              <button type="submit" className="btn btn-quiet">
                {item.status === "archived" ? "Restore as Draft" : "Archive"}
              </button>
            </form>
            <ConfirmForm action={deleteItem.bind(null, item.id)} message={`Delete “${item.name}” permanently? Archive keeps it for records instead.`}>
              <button type="submit" className="btn btn-danger">
                Delete
              </button>
            </ConfirmForm>
          </div>
        )}
      </main>
    </>
  );
}
