import { useState } from "react";
import { usePOS } from "@/app/context/pos-context";
import {
  Globe,
  Settings,
  Image as ImageIcon,
  FileText,
  Palette,
  Eye,
  Save,
  Plus,
  Trash2,
  Edit,
  Upload,
  BarChart3,
  ShoppingBag,
  Users,
  TrendingUp,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Search,
  Star,
  Calendar,
  Clock,
  PoundSterling,
  Package,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { WebsiteBanner, WebsitePage, WebsiteSettings } from "@/app/types";
import { WebsiteOrdersTab } from "@/app/components/website-orders-tab";

export function WebsiteManagementView() {
  const { products } = usePOS();
  const [activeTab, setActiveTab] = useState("overview");

  const [deleteBannerDialog, setDeleteBannerDialog] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
const [deletePageDialog, setDeletePageDialog] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
  
  // Website Settings State
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>({
    id: "1",
    storeName: "BNM parts Store",
    storeTagline: "Your One-Stop Shop for Mobile Accessories",
    storeDescription: "Quality mobile accessories at affordable prices",
    logoUrl: "",
    faviconUrl: "",
    email: "contact@bnmparts.com",
    phone: "+1 (555) 123-4567",
    address: "123 Business Street, City, State 12345",
    facebookUrl: "",
    twitterUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
    metaTitle: "BNM parts Store - Quality Mobile Accessories",
    metaDescription: "Shop the best mobile accessories including cases, chargers, screen protectors, and more.",
    metaKeywords: "mobile accessories, phone cases, chargers, screen protectors",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    accentColor: "#F59E0B",
    fontFamily: "Inter",
    enableOnlineOrdering: true,
    enableProductReviews: true,
    enableWishlist: true,
    enableLiveChat: false,
    freeShippingThreshold: 50,
    shippingFee: 5.99,
    taxRate: 20,
    businessHours: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 6:00 PM",
      friday: "9:00 AM - 6:00 PM",
      saturday: "10:00 AM - 4:00 PM",
      sunday: "Closed",
    },
    updatedAt: new Date(),
  });

  // Banners State
  const [banners, setBanners] = useState<WebsiteBanner[]>([
    {
      id: "1",
      title: "Summer Sale - Up to 50% Off",
      subtitle: "Shop the latest mobile accessories",
      imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
      buttonText: "Shop Now",
      buttonLink: "/products",
      isActive: true,
      order: 1,
      createdAt: new Date(),
    },
    {
      id: "2",
      title: "New iPhone 15 Accessories",
      subtitle: "Protect your new device with premium cases",
      imageUrl: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=1200&h=400&fit=crop",
      buttonText: "Explore",
      buttonLink: "/products/cases",
      isActive: true,
      order: 2,
      createdAt: new Date(),
    },
  ]);

  // Pages State
  const [pages, setPages] = useState<WebsitePage[]>([
    {
      id: "1",
      slug: "about-us",
      title: "About Us",
      content: "<h1>About BNM parts Store</h1><p>We are a leading retailer of mobile accessories...</p>",
      metaTitle: "About Us - BNM parts Store",
      metaDescription: "Learn more about BNM parts Store and our mission",
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      slug: "contact",
      title: "Contact Us",
      content: "<h1>Contact Us</h1><p>Get in touch with our team...</p>",
      metaTitle: "Contact Us - BNM parts Store",
      metaDescription: "Contact BNM parts Store for inquiries and support",
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Dialog States
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<WebsiteBanner | null>(null);
  const [editingPage, setEditingPage] = useState<WebsitePage | null>(null);

  // Form States
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    buttonText: "",
    buttonLink: "",
    isActive: true,
  });

  const [pageForm, setPageForm] = useState({
    slug: "",
    title: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
    isPublished: true,
  });

  // Analytics Data
  const analytics = {
    totalVisitors: 12543,
    todayVisitors: 342,
    onlineOrders: 156,
    conversionRate: 3.2,
    popularProducts: products.slice(0, 5).map((p) => ({
      productId: p.id,
      name: p.name,
      views: Math.floor(Math.random() * 1000),
      orders: Math.floor(Math.random() * 100),
    })),
  };

  // Handlers
  const handleSaveSettings = () => {
    setWebsiteSettings({ ...websiteSettings, updatedAt: new Date() });
    toast.success("Website settings saved successfully");
  };

  const handleAddBanner = () => {
    const newBanner: WebsiteBanner = {
      id: Date.now().toString(),
      ...bannerForm,
      order: banners.length + 1,
      createdAt: new Date(),
    };
    setBanners([...banners, newBanner]);
    setIsBannerDialogOpen(false);
    setBannerForm({ title: "", subtitle: "", imageUrl: "", buttonText: "", buttonLink: "", isActive: true });
    toast.success("Banner added successfully");
  };

  const handleUpdateBanner = () => {
    if (!editingBanner) return;
    setBanners(banners.map((b) => (b.id === editingBanner.id ? { ...b, ...bannerForm } : b)));
    setIsBannerDialogOpen(false);
    setEditingBanner(null);
    setBannerForm({ title: "", subtitle: "", imageUrl: "", buttonText: "", buttonLink: "", isActive: true });
    toast.success("Banner updated successfully");
  };

  const handleDeleteBanner = (id: string) => {
    const banner = banners.find((b) => b.id === id);
    setDeleteBannerDialog({ open: true, id, title: banner?.title || "" });
  };

  const handleEditBanner = (banner: WebsiteBanner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl,
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "",
      isActive: banner.isActive,
    });
    setIsBannerDialogOpen(true);
  };

  const handleAddPage = () => {
    const newPage: WebsitePage = {
      id: Date.now().toString(),
      ...pageForm,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPages([...pages, newPage]);
    setIsPageDialogOpen(false);
    setPageForm({ slug: "", title: "", content: "", metaTitle: "", metaDescription: "", isPublished: true });
    toast.success("Page created successfully");
  };

  const handleUpdatePage = () => {
    if (!editingPage) return;
    setPages(pages.map((p) => (p.id === editingPage.id ? { ...p, ...pageForm, updatedAt: new Date() } : p)));
    setIsPageDialogOpen(false);
    setEditingPage(null);
    setPageForm({ slug: "", title: "", content: "", metaTitle: "", metaDescription: "", isPublished: true });
    toast.success("Page updated successfully");
  };

  const handleDeletePage = (id: string) => {
    const page = pages.find((p) => p.id === id);
    setDeletePageDialog({ open: true, id, title: page?.title || "" });
  };

  const handleEditPage = (page: WebsitePage) => {
    setEditingPage(page);
    setPageForm({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
      isPublished: page.isPublished,
    });
    setIsPageDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-6">
        {/* CHANGE: header flex wraps on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-7 h-7 text-blue-600" />
              Website Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">Manage your online store content and settings</p>
          </div>
          <a href={`${window.location.origin}${window.location.pathname}#/storefront`} target="_blank" rel="noopener noreferrer">
            {/* CHANGE: button full-width on mobile */}
            <Button className="gap-2 w-full sm:w-auto">
              <ExternalLink className="w-4 h-4" />
              View Live Website
            </Button>
          </a>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* CHANGE: tabs scrollable on mobile instead of fixed grid-cols-6 */}
        <div className="overflow-x-auto pb-0 mb-6">
          <TabsList className="flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-6">
            <TabsTrigger value="overview" className="flex-shrink-0">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Overview</span>
              <span className="xs:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-shrink-0">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-shrink-0">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex-shrink-0">
              <ImageIcon className="w-4 h-4 mr-2" />
              Banners
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex-shrink-0">
              <FileText className="w-4 h-4 mr-2" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-shrink-0">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* CHANGE: analytics grid — 2 cols on mobile, 4 on md+ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Visitors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{analytics.totalVisitors.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">All time visitors</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Today's Visitors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{analytics.todayVisitors}</div>
                <p className="text-xs text-gray-500 mt-1">Visitors today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Online Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{analytics.onlineOrders}</div>
                <p className="text-xs text-gray-500 mt-1">Total orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{analytics.conversionRate}%</div>
                <p className="text-xs text-gray-500 mt-1">Visitors to customers</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common website management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {/* CHANGE: 2 cols on mobile, 4 on md+ */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActiveTab("banners")}
                >
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                  <span className="text-sm">Manage Banners</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActiveTab("pages")}
                >
                  <FileText className="w-6 h-6 text-green-600" />
                  <span className="text-sm">Edit Pages</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActiveTab("products")}
                >
                  <Package className="w-6 h-6 text-purple-600" />
                  <span className="text-sm">Manage Products</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="w-6 h-6 text-orange-600" />
                  <span className="text-sm">Website Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular Products */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Products</CardTitle>
              <CardDescription>Top performing products on your website</CardDescription>
            </CardHeader>
            {/* CHANGE: horizontal scroll wrapper for table on small screens */}
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.popularProducts.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.views}</TableCell>
                      <TableCell>{item.orders}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {((item.orders / item.views) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Online Orders Tab */}
        <TabsContent value="orders">
          <WebsiteOrdersTab />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Basic information about your online store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">Store Name *</Label>
                  <Input
                    id="storeName"
                    value={websiteSettings.storeName}
                    onChange={(e) =>
                      setWebsiteSettings({ ...websiteSettings, storeName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="storeTagline">Store Tagline</Label>
                  <Input
                    id="storeTagline"
                    value={websiteSettings.storeTagline}
                    onChange={(e) =>
                      setWebsiteSettings({ ...websiteSettings, storeTagline: e.target.value })
                    }
                    placeholder="Your catchy tagline"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="storeDescription">Store Description</Label>
                <Textarea
                  id="storeDescription"
                  value={websiteSettings.storeDescription}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, storeDescription: e.target.value })
                  }
                  rows={3}
                  placeholder="Brief description of your store"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={websiteSettings.email}
                    onChange={(e) =>
                      setWebsiteSettings({ ...websiteSettings, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone *
                  </Label>
                  <Input
                    id="phone"
                    value={websiteSettings.phone}
                    onChange={(e) =>
                      setWebsiteSettings({ ...websiteSettings, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={websiteSettings.address}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, address: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={websiteSettings.facebookUrl}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, facebookUrl: e.target.value })
                  }
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div>
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={websiteSettings.instagramUrl}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, instagramUrl: e.target.value })
                  }
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>
              <div>
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  value={websiteSettings.twitterUrl}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, twitterUrl: e.target.value })
                  }
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Optimize your website for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={websiteSettings.metaTitle}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, metaTitle: e.target.value })
                  }
                  placeholder="Your store name - Brief description"
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={websiteSettings.metaDescription}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, metaDescription: e.target.value })
                  }
                  rows={3}
                  placeholder="Brief description of your store for search engines (150-160 characters)"
                />
              </div>
              <div>
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={websiteSettings.metaKeywords}
                  onChange={(e) =>
                    setWebsiteSettings({ ...websiteSettings, metaKeywords: e.target.value })
                  }
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Colors</CardTitle>
              <CardDescription>Customize your website appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CHANGE: 1 col on mobile, 3 on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={websiteSettings.primaryColor}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, primaryColor: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      value={websiteSettings.primaryColor}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, primaryColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={websiteSettings.secondaryColor}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, secondaryColor: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      value={websiteSettings.secondaryColor}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, secondaryColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={websiteSettings.accentColor}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, accentColor: e.target.value })
                      }
                      className="w-20 h-10"
                    />
                    <Input
                      value={websiteSettings.accentColor}
                      onChange={(e) =>
                        setWebsiteSettings({ ...websiteSettings, accentColor: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Enable or disable website features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Online Ordering</Label>
                  <p className="text-sm text-gray-600">Allow customers to purchase online</p>
                </div>
                <Switch
                  checked={websiteSettings.enableOnlineOrdering}
                  onCheckedChange={(checked) =>
                    setWebsiteSettings({ ...websiteSettings, enableOnlineOrdering: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Product Reviews</Label>
                  <p className="text-sm text-gray-600">Allow customers to leave reviews</p>
                </div>
                <Switch
                  checked={websiteSettings.enableProductReviews}
                  onCheckedChange={(checked) =>
                    setWebsiteSettings({ ...websiteSettings, enableProductReviews: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Wishlist</Label>
                  <p className="text-sm text-gray-600">Enable wishlist functionality</p>
                </div>
                <Switch
                  checked={websiteSettings.enableWishlist}
                  onCheckedChange={(checked) =>
                    setWebsiteSettings({ ...websiteSettings, enableWishlist: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold">Live Chat</Label>
                  <p className="text-sm text-gray-600">Enable live chat support</p>
                </div>
                <Switch
                  checked={websiteSettings.enableLiveChat}
                  onCheckedChange={(checked) =>
                    setWebsiteSettings({ ...websiteSettings, enableLiveChat: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping & Payment</CardTitle>
              <CardDescription>Configure shipping and payment options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CHANGE: 1 col on mobile, 3 on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="shippingFee">Shipping Fee (£)</Label>
                  <Input
                    id="shippingFee"
                    type="number"
                    step="0.01"
                    value={websiteSettings.shippingFee}
                    onChange={(e) =>
                      setWebsiteSettings({
                        ...websiteSettings,
                        shippingFee: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="freeShippingThreshold">Free Shipping Threshold (£)</Label>
                  <Input
                    id="freeShippingThreshold"
                    type="number"
                    step="0.01"
                    value={websiteSettings.freeShippingThreshold}
                    onChange={(e) =>
                      setWebsiteSettings({
                        ...websiteSettings,
                        freeShippingThreshold: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={websiteSettings.taxRate}
                    onChange={(e) =>
                      setWebsiteSettings({
                        ...websiteSettings,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            {/* CHANGE: full-width on mobile */}
            <Button onClick={handleSaveSettings} size="lg" className="gap-2 w-full sm:w-auto">
              <Save className="w-4 h-4" />
              Save All Settings
            </Button>
          </div>
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-6">
          <Card>
            <CardHeader>
              {/* CHANGE: header wraps on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Homepage Banners</CardTitle>
                  <CardDescription>Manage promotional banners on your homepage</CardDescription>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setEditingBanner(null);
                    setBannerForm({
                      title: "",
                      subtitle: "",
                      imageUrl: "",
                      buttonText: "",
                      buttonLink: "",
                      isActive: true,
                    });
                    setIsBannerDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Banner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {banners.map((banner) => (
                  <Card key={banner.id}>
                    <CardContent className="pt-6">
                      {/* CHANGE: banner card stacks on mobile */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div
                          className="w-full sm:w-48 h-40 sm:h-32 rounded-lg bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${banner.imageUrl})` }}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{banner.title}</h3>
                              <p className="text-sm text-gray-600">{banner.subtitle}</p>
                            </div>
                            <Badge variant={banner.isActive ? "default" : "secondary"}>
                              {banner.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-3">
                            <p>Button: {banner.buttonText || "None"}</p>
                            <p>Link: {banner.buttonLink || "None"}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditBanner(banner)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteBanner(banner.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              {/* CHANGE: header wraps on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Website Pages</CardTitle>
                  <CardDescription>Manage custom pages on your website</CardDescription>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setEditingPage(null);
                    setPageForm({
                      slug: "",
                      title: "",
                      content: "",
                      metaTitle: "",
                      metaDescription: "",
                      isPublished: true,
                    });
                    setIsPageDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Page
                </Button>
              </div>
            </CardHeader>
            {/* CHANGE: horizontal scroll for table on mobile */}
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">/{page.slug}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.isPublished ? "default" : "secondary"}>
                          {page.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPage(page)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeletePage(page.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Product Settings</CardTitle>
              <CardDescription>Control which products appear on your website</CardDescription>
            </CardHeader>
            {/* CHANGE: horizontal scroll for table on mobile */}
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Website Visible</TableHead>
                    <TableHead className="hidden sm:table-cell">Featured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 10).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{product.category}</TableCell>
                      <TableCell>£{product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                          {product.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch defaultChecked={true} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Switch defaultChecked={false} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Banner Dialog */}
      {/* CHANGE: max-w-2xl constrained, mx-4 on mobile via DialogContent */}
      <Dialog open={isBannerDialogOpen} onOpenChange={setIsBannerDialogOpen}>
        <DialogContent className="w-full max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
            <DialogDescription>
              Create promotional banners for your homepage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bannerTitle">Banner Title *</Label>
              <Input
                id="bannerTitle"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                placeholder="Summer Sale - Up to 50% Off"
              />
            </div>
            <div>
              <Label htmlFor="bannerSubtitle">Subtitle</Label>
              <Input
                id="bannerSubtitle"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                placeholder="Shop the latest mobile accessories"
              />
            </div>
            <div>
              <Label htmlFor="bannerImage">Image URL *</Label>
              <Input
                id="bannerImage"
                value={bannerForm.imageUrl}
                onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                placeholder="https://example.com/banner.jpg"
              />
            </div>
            {/* CHANGE: stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={bannerForm.buttonText}
                  onChange={(e) => setBannerForm({ ...bannerForm, buttonText: e.target.value })}
                  placeholder="Shop Now"
                />
              </div>
              <div>
                <Label htmlFor="buttonLink">Button Link</Label>
                <Input
                  id="buttonLink"
                  value={bannerForm.buttonLink}
                  onChange={(e) => setBannerForm({ ...bannerForm, buttonLink: e.target.value })}
                  placeholder="/products"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="bannerActive">Active Status</Label>
              <Switch
                id="bannerActive"
                checked={bannerForm.isActive}
                onCheckedChange={(checked) => setBannerForm({ ...bannerForm, isActive: checked })}
              />
            </div>
          </div>
          {/* CHANGE: footer buttons stack on mobile */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsBannerDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={editingBanner ? handleUpdateBanner : handleAddBanner}>
              {editingBanner ? "Update" : "Add"} Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Dialog */}
      <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
        <DialogContent className="w-full max-w-3xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
            <DialogDescription>
              Create custom pages for your website
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* CHANGE: stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pageTitle">Page Title *</Label>
                <Input
                  id="pageTitle"
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                  placeholder="About Us"
                />
              </div>
              <div>
                <Label htmlFor="pageSlug">URL Slug *</Label>
                <Input
                  id="pageSlug"
                  value={pageForm.slug}
                  onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                  placeholder="about-us"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pageContent">Content *</Label>
              <Textarea
                id="pageContent"
                value={pageForm.content}
                onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                rows={10}
                placeholder="<h1>Page Title</h1><p>Your content here...</p>"
              />
            </div>
            <div>
              <Label htmlFor="pageMetaTitle">SEO Title</Label>
              <Input
                id="pageMetaTitle"
                value={pageForm.metaTitle}
                onChange={(e) => setPageForm({ ...pageForm, metaTitle: e.target.value })}
                placeholder="About Us - Your Store Name"
              />
            </div>
            <div>
              <Label htmlFor="pageMetaDescription">SEO Description</Label>
              <Textarea
                id="pageMetaDescription"
                value={pageForm.metaDescription}
                onChange={(e) => setPageForm({ ...pageForm, metaDescription: e.target.value })}
                rows={3}
                placeholder="Brief description for search engines"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pagePublished">Publish Status</Label>
              <Switch
                id="pagePublished"
                checked={pageForm.isPublished}
                onCheckedChange={(checked) =>
                  setPageForm({ ...pageForm, isPublished: checked })
                }
              />
            </div>
          </div>
          {/* CHANGE: footer buttons stack on mobile */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsPageDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={editingPage ? handleUpdatePage : handleAddPage}>
              {editingPage ? "Update" : "Create"} Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Banner Dialog */}
<Dialog open={deleteBannerDialog.open} onOpenChange={(o) => !o && setDeleteBannerDialog({ open: false, id: "", title: "" })}>
  <DialogContent className="w-[90vw] sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <Trash2 className="w-5 h-5" />
        Delete Banner
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete <strong>"{deleteBannerDialog.title}"</strong>? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
      <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteBannerDialog({ open: false, id: "", title: "" })}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          setBanners(banners.filter((b) => b.id !== deleteBannerDialog.id));
          toast.success("Banner deleted successfully");
          setDeleteBannerDialog({ open: false, id: "", title: "" });
        }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Delete Page Dialog */}
<Dialog open={deletePageDialog.open} onOpenChange={(o) => !o && setDeletePageDialog({ open: false, id: "", title: "" })}>
  <DialogContent className="w-[90vw] sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <Trash2 className="w-5 h-5" />
        Delete Page
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete <strong>"{deletePageDialog.title}"</strong>? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="gap-2 flex-col sm:flex-row pt-2">
      <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeletePageDialog({ open: false, id: "", title: "" })}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          setPages(pages.filter((p) => p.id !== deletePageDialog.id));
          toast.success("Page deleted successfully");
          setDeletePageDialog({ open: false, id: "", title: "" });
        }}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}