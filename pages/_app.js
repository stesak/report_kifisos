import { Provider } from "react-redux";
import { store } from "../store/store";
import "leaflet/dist/leaflet.css";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}
