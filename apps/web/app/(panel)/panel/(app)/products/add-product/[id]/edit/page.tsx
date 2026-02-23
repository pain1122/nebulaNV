import AddProductClient from "../../AddProduct.client";

export default function EditProductPage({
  params,
}: {
  params: { id?: string };
}) {
  return <AddProductClient productId={params?.id} />;
}
