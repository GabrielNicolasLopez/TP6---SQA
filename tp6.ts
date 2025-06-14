type DBConnection = {};
type User = {};
type Order = { id: number };

let dbConnection: DBConnection = null;
var GLOBAL_STATUS = "IDLE";

function processOrders(
  user: User,
  orders: Order[],
  sendEmail: boolean,
  discount: number,
  log: boolean,
  alertAdmin: boolean,
  locale: string,
  isHoliday: boolean,
  retries: number,
  currency: string
): number[] {
  var allResults: number[] = [];
  if (!user) {
    if (log) {
      console.log("No user provided");
    }
    return [];
  }
  if (orders == null || orders.length === 0) {
    console.log(`No orders found for user: ${user.id}`);
    return;
  }
  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];
    let result: {
      success: boolean;
      id: number;
    } = null;
    if (order.status === "CANCELLED") {
      if (log) {
        console.log(`Order cancelled: ${order.id}`);
      }
      continue;
    } else if (order.status == "PENDING") {
      if (retries > 0) {
        for (let j = 0; j < retries; j++) {
          try {
            if (Math.random() > 0.95) throw new Error("Random error!");
            result = { success: true, id: order.id };
            break;
          } catch (e) {
            if (j == retries - 1) {
              if (alertAdmin) notifyAdmin(order, user, e);
            }
          }
        }
      } else {
        result = { success: false, reason: 'No retries left' };
      }
    } else if (
      order.status == "COMPLETED" ||
      order.status == "SHIPPED" ||
      order.status == "DELIVERED" ||
      order.status == "INVOICED"
    ) {
      let price = order.price;
      if (isHoliday && discount > 0.1) {
        price = price - price * discount;
        if (price < 0) price = 0;
      }
      if (currency !== "USD") {
        if (currency == "EUR") price = price * 0.92;
        else if (currency == "JPY") price = price * 150.2;
        else if (currency == "BTC") price = price / 69000;
      }
      if (sendEmail) {
        sendOrderEmail(user.email, order, price, locale);
      }
      result = { success: true, id: order.id, finalPrice: price };
    } else {
      if (log) console.log("Unknown order status: " + order.status);
      result = { success: false, reason: "Unknown status" };
    }
    if (result) {
      allResults.push(result);
    }
  }
  if (log) console.log("Processed " + allResults.length + " orders");
  GLOBAL_STATUS = "DONE";
  dbConnection = "closed";
  return allResults;
}

function sendOrderEmail(email, order, price, locale) {
  if (locale == "es") {
    console.log(
      "Enviando correo a " +
        email +
        " por orden " +
        order.id +
        " con precio " +
        price
    );
  } else {
    console.log(
      "Sending email to " +
        email +
        " for order " +
        order.id +
        " with price " +
        price
    );
  }
}

function notifyAdmin(order, user, error) {
  GLOBAL_STATUS = "ALERT";
  console.log(
    "ALERT ADMIN! Order " +
      order.id +
      " failed for user " +
      user.id +
      ": " +
      error
  );
}

function reset() {
  dbConnection = null;
  GLOBAL_STATUS = "IDLE";
}

function main() {
  let user = { id: 42, email: "test@company.com" };
  let orders = [
    { id: 1, status: 'COMPLETED', price: 102 },
    { id: 2, status: 'CANCELLED', price: 50 },
    { id: 3, status: 'PENDING', price: 33 },
    { id: 4, status: 'INVOICED', price: 200 },
  ];
  let results = processOrders(
    user,
    orders,
    true,
    0.15,
    true,
    true,
    'es',
    true,
    2,
    "EUR"
  );
  console.log(results);
  reset();
}

main();
