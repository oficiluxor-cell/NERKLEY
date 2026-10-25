"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  image_url?: string;
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error al cargar inventario:", error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleUpdateProduct = async (id: string, field: keyof Product, value: any) => {
    setSavingId(id);
    
    // Actualizar en tiempo real en la interfaz
    setProducts((prev) =>
      prev.map((prod) => (prod.id === id ? { ...prod, [field]: value } : prod))
    );

    // Actualizar en la base de datos de Supabase
    const { error } = await supabase
      .from("products")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      alert(`Error al actualizar el producto: ${error.message}`);
      fetchProducts(); // Revertir cambios en caso de error
    }
    
    setSavingId(null);
  };

  return (
    <main className="min-h-screen bg-white text-black p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center border-b border-neutral-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-serif uppercase tracking-widest font-bold">NERKLEY // Inventario</h1>
            <p className="text-xs uppercase tracking-wider text-neutral-400 mt-1">Control de Stock y Visibilidad de Catálogo</p>
          </div>
          <button 
            onClick={fetchProducts}
            className="bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-md"
          >
            Actualizar Catálogo
          </button>
        </header>

        {loading ? (
          <div className="text-center py-20 text-xs uppercase tracking-widest text-neutral-400">
            Cargando base de datos de productos...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-[#fafafa] border border-neutral-200">
            <p className="text-xs uppercase tracking-widest text-neutral-400">No hay productos registrados en el inventario.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200 bg-[#fafafa]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-widest text-neutral-500 bg-white">
                  <th className="p-4 w-16">Ref</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4 w-48">Precio (COP)</th>
                  <th className="p-4 w-40">Stock Disponible</th>
                  <th className="p-4 w-40">Estado en Tienda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-white transition-colors">
                    <td className="p-4 font-mono text-[10px] text-neutral-400">
                      #{product.id.substring(0, 6)}
                    </td>
                    <td className="p-4 font-bold uppercase tracking-wider">
                      {product.name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">$</span>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(e) => handleUpdateProduct(product.id, "price", Number(e.target.value))}
                          className="w-full bg-transparent border-b border-neutral-300 py-1 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        value={product.stock}
                        onChange={(e) => handleUpdateProduct(product.id, "stock", Number(e.target.value))}
                        className={`w-20 px-2 py-1 border focus:outline-none transition-colors ${
                          product.stock <= 3 
                            ? "bg-red-50 border-red-300 text-red-700 focus:border-red-700" 
                            : "bg-transparent border-neutral-300 focus:border-black"
                        }`}
                      />
                      {product.stock <= 3 && (
                        <span className="text-[9px] text-red-500 font-bold uppercase ml-2 tracking-widest">
                          Bajo
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleUpdateProduct(product.id, "is_active", !product.is_active)}
                        disabled={savingId === product.id}
                        className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors w-full border ${
                          product.is_active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            : "bg-neutral-100 border-neutral-200 text-neutral-400 hover:bg-neutral-200"
                        }`}
                      >
                        {product.is_active ? "Público" : "Oculto"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}