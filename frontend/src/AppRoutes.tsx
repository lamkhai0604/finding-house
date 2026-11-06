import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { RequireRole } from "./components/RequireRole";
import { FavoritesProvider } from "./favorites/FavoritesProvider";
import { BrowsePage } from "./pages/BrowsePage";
import { HomePage } from "./pages/HomePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { ListingFormPage } from "./pages/ListingFormPage";
import { LoginPage } from "./pages/LoginPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SavedRoomsPage } from "./pages/SavedRoomsPage";

/** All routes. Kept separate from the browser router so tests can use a memory router. */
export function AppRoutes() {
  return (
    <FavoritesProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="listings/:id" element={<ListingDetailPage />} />
          <Route
            path="listings/new"
            element={
              <RequireRole role="LANDLORD">
                <ListingFormPage />
              </RequireRole>
            }
          />
          <Route
            path="listings/:id/edit"
            element={
              <RequireRole role="LANDLORD">
                <ListingFormPage />
              </RequireRole>
            }
          />
          <Route
            path="my/listings"
            element={
              <RequireRole role="LANDLORD">
                <MyListingsPage />
              </RequireRole>
            }
          />
          <Route
            path="my/saved"
            element={
              <RequireRole role="TENANT">
                <SavedRoomsPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </FavoritesProvider>
  );
}
