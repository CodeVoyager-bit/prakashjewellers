import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/admin";
import { AdminBar } from "@/components/admin-bar";
import { BackIcon } from "@/components/icons";
import { ConfirmForm } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getCategories, getItem, getSettings } from "@/lib/data";
import { deleteItem } from "../../actions";

export const metadata = { title: "Item", robots: { index: false } };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [item, categories, s] = await Promise.all([id === "new" ? null : getItem(id), getCategories(), getSettings()]);
  if (id !== "new" && !item) notFound();

  return (
    <>
      <AdminBar name={s.name} />
      <main className="wrap admin narrow">
        <Link href="/admin" className="back">
          <BackIcon size={18} /> Back to Staff Home
        </Link>
        <h1>{item ? `Edit ${item.name}` : "Add Item"}</h1>
        <ItemForm item={item} categories={categories} />
        {item && (
          <ConfirmForm action={deleteItem.bind(null, item.id)} message={`Delete “${item.name}” from the catalogue? This can’t be undone.`}>
            <button type="submit" className="btn btn-danger">
              Delete Item
            </button>
          </ConfirmForm>
        )}
      </main>
    </>
  );
}
