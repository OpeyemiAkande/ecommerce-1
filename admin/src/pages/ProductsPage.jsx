import {useState} from "react";
import {PlusIcon, PencilIcon, TrashIcon, XIcon, ImageIcon} from "lucide-react";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {productApi} from "../lib/api";
import {getStockStatusBadge} from "../lib/utils";

function ProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: ""
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const queryClient = useQueryClient();

  const {data: products = []} = useQuery({
    queryKey: ["products"],
    queryFn: productApi.getAll
  });

  const createProductMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      closeModal();
      queryClient.invalidateQueries({queryKey: ["products"]});
    }
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      price: "",
      stock: "",
      description: ""
    });
    setImages([]);
    setImagePreviews([]);
  };

  return (
    <div>
      <h1>Products</h1>
    </div>
  );
}

export default ProductsPage;
