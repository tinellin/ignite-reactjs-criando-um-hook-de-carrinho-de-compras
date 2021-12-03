import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

type CartProviderProps = {
  children: ReactNode;
};

type UpdateProductAmount = {
  productId: number;
  amount: number;
};

type CartContextData = {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
};

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) return JSON.parse(storagedCart);

    return [];
  });

  async function addProduct(productId: number) {
    try {
      const { data: productStock } = await api.get<Stock>(
        `/stock/${productId}`
      );

      if (productStock.amount === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productFound = updatedCart.find(
        (product) => product.id === productId
      );

      //Produto já foi colocado no carrinho
      if (productFound) {
        if (productFound.amount + 1 <= productStock.amount) {
          productFound.amount += 1;
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      } else {
        //Colocar o produto pela primeira vez no carrinho
        const { data: productWithoutAmount } = await api.get<Product>(
          `products/${productId}`
        );

        if (productWithoutAmount) {
          const product = { ...productWithoutAmount, amount: 1 };
          updatedCart.push(product);
        }
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  }

  async function removeProduct(productId: number) {
    try {
      const newCart = cart.filter((product) => product.id !== productId);

      if (newCart && newCart.length !== cart.length) {
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else throw Error;
    } catch {
      toast.error('Erro na remoção do produto');
    }
  }

  async function updateProductAmount({
    productId,
    amount,
  }: UpdateProductAmount) {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount <= 0 || amount <= 0) {
        throw new Error();
      }

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const product = updatedCart.find((product) => product.id === productId);

      if (product) {
        product.amount = amount;

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else throw new Error();
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  }
  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  return context;
}
