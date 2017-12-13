/* -----------------------------------------------------------
                    CONFIG MODULES 
-------------------------------------------------------------*/
const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store);

/* -----------------------------------------------------------
                     BCRYPT
-------------------------------------------------------------*/
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 'myPassword';
const someOtherPlaintextPassword = 'somePassword';


/* -----------------------------------------------------------
            SEQUELIZE, SESSIONS & SEQUELIZE STORE
-------------------------------------------------------------*/
const Sequelize = require('sequelize')
const sequelize = new Sequelize('final_project', process.env.POSTGRES_USER, null, {
    host: 'localhost',
    dialect: 'postgres',
    storage: './session.postgres',
    define: {
        timestamps: true
    }
});

app.use(session({
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000,
        expiration: 24 * 60 * 60 * 1000
    }),
    secret: "safe",
    saveUnitialized: true,
    resave: false
}));



/* -----------------------------------------------------------
                    VIEWS / MIDDLEWARE  
-------------------------------------------------------------*/
app.use(express.static('public'))
app.set('views', 'views')
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: true }));


/* -----------------------------------------------------------
                     MULTER 
-------------------------------------------------------------*/
const multer = require('multer')
const myStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/images/user-images')
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})
const upload = multer({ storage: myStorage });





/* -----------------------------------------------------------
                     MODEL DEFINITIONS  
-------------------------------------------------------------*/
const User = sequelize.define('users', {
    firstname: { type: Sequelize.STRING },
    lastname: { type: Sequelize.STRING },
    email: { type: Sequelize.STRING, unique: true },
    password: { type: Sequelize.STRING },
    profilePicture: { type: Sequelize.STRING }
})

const Product = sequelize.define('products', {
    product_title: { type: Sequelize.STRING },
    body: { type: Sequelize.TEXT },
    category: { type: Sequelize.STRING },
    color: { type: Sequelize.STRING },
    material: { type: Sequelize.STRING },
    price: { type: Sequelize.INTEGER },
    likes: { type: Sequelize.INTEGER },
    product_image: { type: Sequelize.STRING }
})

const Comment = sequelize.define('comments', {
    review: { type: Sequelize.TEXT }
})


/* -----------------------------------------------------------
                    MODEL ASSOCIATIONS
-------------------------------------------------------------*/

User.hasMany(Product);
Product.belongsTo(User);

User.hasMany(Comment);
Comment.belongsTo(User);

Product.hasMany(Comment);
Comment.belongsTo(Product)

sequelize.sync();





// routing

app.get('/faq', function(request, response) {
    response.render('faq')
});


app.get('/contact', function(request, response) {
    response.render('contact')
});


/* -----------------------------------------------------------
                LANDING PAGE W/ LOGIN
-------------------------------------------------------------*/

// HOME page----------------------------------------index.pug
app.get('/', function(request, response) {
    response.render('index', {
        message: request.query.message,
        user: request.session.user
    });
});


app.post('/', function(request, response) {

    var email = request.body.email
    var password = request.body.password

    User.findOne({
            where: {
                email: email
            }
        })
        .then(function(user) {
            if (user !== null) {
                bcrypt.compare(password, user.password, function(err, res) { // compare PW with hash in DB
                    if (res) {
                        request.session.user = user;
                        console.log('SESSION IS' + request.session.user);
                        response.redirect('profile');
                    } else {
                        response.redirect('/?message=' + encodeURIComponent('Login not successful! Please try again.'));
                    }
                })
            } else {
                response.redirect('/?message=' + encodeURIComponent('This email address does not exist.'));
            }
        })
        .catch(function(error) {
            console.error(error)
        })
});




/* -----------------------------------------------------------
                       SIGNUP PAGE
-------------------------------------------------------------*/

// GET signup.pug

app.get("/signup", (req, res) => {
    res.render("signup");
})

// POST signup.pug --- redirect to /profile

app.post('/signup', upload.single('profileImage'), (req, res, next) => {
    let path = req.file.path.replace('public', '')
    bcrypt.hash(req.body.password, 10)
        .then(function(hash) {

            User.create({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                password: hash,
                profilePicture: path

            }).then((user) => {
                req.session.user = user;
                res.redirect('profile');
            })
        })
})



/* -----------------------------------------------------------
                      PROFILE PAGES
-------------------------------------------------------------*/

// GET profile.pug 

app.get('/profile', function(request, response) {
    const banana = request.session.user;

    Product.findAll({
            where: {
                userId: banana.id
            },
            include: [{
                model: User
            }]
        })
        .then((products) => {
            console.log(products)
            const mapped = products.map(function(object) {
                return object.dataValues;
            });
            console.log(mapped);
            response.render('profile', { user: banana, userposts: mapped });
        })
});



// GET profile_one.pug --- indiv. profile page

app.get('/allusers/:profileId', (req, res) => {

    const profileId = req.params.profileId;

    User.findOne({
            where: {
                id: profileId
            },
            include: [{
                model: Product
            }]
        })
        .then(function(user) {
            res.render("profile_one", { id: profileId, firstname: user.firstname, lastname: user.lastname, email: user.email, profilePicture: user.profilePicture })
        })
})



/* -----------------------------------------------------------
                     NEW PRODUCT
-------------------------------------------------------------*/

// GET new_product.pug

app.get('/new_product', function(req, res) {
    console.log('Logged in user is ' + req.session.user.firstname)
    res.render("new_product");
});


// POST new_product.pug --- redirect to product_one.pug

app.post('/new_product', upload.single('product_image'), (req, res, next) => {

// app.post('/new_product', multer({ dest: '../public/images/user-products/'}).single('upl'), function(req,res){
let path = req.file.path.replace('public', '');
var product_title = req.body.product_title;
var body = req.body.body;
var userId = req.session.user.id
	
	User.findOne({
        where: {
            id: userId
        }
    })
    .then(function(user) {
        return user.createProduct({
            product_title: req.body.product_title,
            body: req.body.body,
            category: req.body.category,
            body: req.body.body,
            color: req.body.color,
            material: req.body.material,
            price: req.body.price,
            product_image: path
        })
    })
    .then((product) => {
        res.redirect(`/all_products/${product.id}`);
        })
});


/* -----------------------------------------------------------
                      ALL PRODUCTS
-------------------------------------------------------------*/

// GET all_products.pug

app.get('/all_products', function(req, res) {

    Product.findAll({
            include: [{
                model: User
            }]
        })
        .then((products) => {
            res.render('all_products', { productList: products })
        })
})


// GET product_one.pug --- productId

app.get('/all_products/:productId', function(req, res) {

    const productId = req.params.productId;

    let post = {};
    let author = {};

    Product.findOne({
            where: {
                id: productId
            },
            include: [{
                model: User
            }]
        })
        .then(function(product) {
            post = product.dataValues;
            author = product.user.dataValues;

            return Comment.findAll({
                where: {
                    productId: productId
                },
                include: [{
                    model: User
                }]
            })
        })
        .then(comments => {
            const mappedComments = comments.map(function(object) {
                return object.dataValues;
            });

            res.render("product_one", { product: post, user: author, comments: mappedComments });
        });
});



/* -----------------------------------------------------------
                      ALL USERS
-------------------------------------------------------------*/

// GET allusers.pug

app.get('/allusers', function(request, response) {
    User.findAll().then(function(users) {
        users = users.map(function(userRow) {
            var columns = userRow.dataValues;
            return {
                id: columns.id,
                firstname: columns.firstname,
                lastname: columns.lastname,
                email: columns.email,
                profilePicture: columns.profilePicture
            }
        });

        response.render('allusers', {
            userResults: users
        });
    });
});




/* -----------------------------------------------------------
                      COMMENTS
-------------------------------------------------------------*/

// POST (product_one.pug) --- no indiv pug page

app.post('/product_one/:productId', function(req, res) {

    var review = req.body.review;
    var userId = req.session.user.id;
    var productId = req.params.productId;

    User.findOne({
            where: {
                id: userId
            }
        })
        .then(function(user) {
            return user.createComment({
                review: review,
                userId: userId,
                productId: productId
            })
        })
        .then((comment) => {
            res.redirect(`/all_products/${comment.productId}`);
        })
});



/* -----------------------------------------------------------
                      LOGOUT
-------------------------------------------------------------*/

// GET (no pug page)

app.get('/logout', function(request, response) {
    request.session.destroy(function(error) {
        if (error) {
            throw error;
        }
        response.redirect('/?message=' + encodeURIComponent('Successfully logged out.'));
    })
});







/* ---------- PORT -------------------------------------------- */
app.listen(3000, function() {
    console.log("App listening on port 3000")
})