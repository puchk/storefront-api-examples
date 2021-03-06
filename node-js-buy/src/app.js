import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import Client from 'shopify-buy';
import client from './js-buy-sdk';

const app = express();
const productsPromise = client.fetchAllProducts();
const shopPromise = client.fetchShopInfo();

app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, '../../shared')));

app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
  const checkoutId = req.query.checkoutId;

  // Create a checkout if it doesn't exist yet
  if (!checkoutId) {
    return client.createCheckout({allowPartialAddresses: true, shippingAddress: {city: 'Toronto', province: 'ON', country: 'Canada'}}).then((checkout) => {
      res.redirect(`/?checkoutId=${checkout.id}`);
    });
  }

  // Fetch the checkout
  const cartPromise = client.fetchCheckout(checkoutId);

  return Promise.all([productsPromise, cartPromise, shopPromise]).then(([products, cart, shop]) => {
    res.render('index', {
      products,
      cart,
      shop,
      isCartOpen: req.query.cart
    });
  });
});

app.post('/add_line_item/:id', (req, res) => {
  const options = req.body;
  const productId = req.params.id;
  const checkoutId = options.checkoutId;
  const quantity = parseInt(options.quantity, 10);

  delete options.quantity;
  delete options.checkoutId;

  return productsPromise.then((products) => {
    // Find the product that is selected
    const targetProduct = products.find((product) => {
      return product.id === productId;
    });

    // Find the corresponding variant
    const selectedVariant = Client.Product.Helpers.variantForOptions(targetProduct, options);

    // Add the variant to our cart
    return client.addLineItems(checkoutId, [{variantId: selectedVariant.id, quantity}]).then((checkout) => {
      res.redirect(`/?cart=true&checkoutId=${checkout.id}`);
    });
  });
});

app.post('/remove_line_item/:id', (req, res) => {
  const checkoutId = req.body.checkoutId;

  return client.removeLineItems(checkoutId, [req.params.id]).then((checkout) => {
    res.redirect(`/?cart=true&checkoutId=${checkout.id}`);
  });
});

app.post('/decrement_line_item/:id', (req, res) => {
  const checkoutId = req.body.checkoutId;
  const quantity = parseInt(req.body.currentQuantity, 10) - 1;

  return client.updateLineItems(checkoutId, [{id: req.params.id, quantity}]).then((checkout) => {
    res.redirect(`/?cart=true&checkoutId=${checkout.id}`);
  });
});

app.post('/increment_line_item/:id', (req, res) => {
  const checkoutId = req.body.checkoutId;
  const quantity = parseInt(req.body.currentQuantity, 10) + 1;

  return client.updateLineItems(checkoutId, [{id: req.params.id, quantity}]).then((checkout) => {
    res.redirect(`/?cart=true&checkoutId=${checkout.id}`);
  });
});

app.listen(4200, () => {
  console.log('Example app listening on port 4200!'); // eslint-disable-line no-console
});
