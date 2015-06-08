define([
    "jwebkit",    
    "jwebdesk",
], function(jwk, jwebdesk) {
    
    function instalar_plugin(launchbar) {
        var data = new jwk.Node({time: ""});
        
        /*
        tiene que preguntar si el usuario esta logeado o no y mostrar "login | register" o "<icono> username"
        el botón login le tiene que pedir al user-auth que se logue, lo que va a levantar un popup y el usuario se va a loguear.
        se supone que el user-auth genera un evento "logged" al que me pruedo suscribir para actualizar mi estado.
        Si mi estado es de logged y me hacen click sobre el username se tiene que desplegar un menu que tenga una opción para logout
        */
        
        data.on("change:logged", function(n,e) {
            var layout = ["login"];
            if (e.value) {
                layout = ["userlog"];
            }
            
            data.set("layout", layout, {no_parse:true});
        });
        
        jwebdesk.wait_service("user-auth").then(function (user){
            return user.logged();
        }).then(function (is_logged, user) {       
            data.set("logged", is_logged);
            if (user) {
                // data.set("username", user.name);
            }
            if (is_logged) {
                function update_user_name() {
                    launchbar.load_drives().then(function (drives) {
                        return drives.user.get("root").stat("/profile/name");
                    }).then(function (node) {                    
                        data.set("username", JSON.parse(node.data));
                    });
                    launchbar.load_drives().then(function (drives) {
                        return drives.user.get("root").stat("/profile/webident");
                    }).then(function (node) {
                        // console.log("GOOL!!! webident:", JSON.parse(node.data));
                        data.set("webident", JSON.parse(node.data));
                    });
                }
                update_user_name();
                
                launchbar.load_drives().then(function (drives) {
                    drives.user.on("change_data", update_user_name, "Context");                    
                });
            }
        });
        
        launchbar.add_component("user", {
            "data": data,
            "layout": "<<data.layout>>",
            "ui_type": "panel.layout",
            "children": {
                "login": {
                    "ui_type": "panel",
                    "class": "expand",
                    "children": {
                        "login_btn": {
                            "ui_type": "button",
                            "class": "flat",
                            "text": "login"
                        },
                        "register_btn": {
                            "ui_type": "button",
                            "class": "flat",
                            "text": "register"
                        }
                    }
                },
                "userlog": {
                    "ui_type": "panel",
                    "class": "expand",
                    "children": {
                        "user_btn": {
                            "ui_type": "button",
                            "class": "flat",
                            "text": "<<data.username>>"
                        }                        
                    }
                }
            },            
        }).done(function (tree) {
            
            tree.one("render", function () {
                launchbar.adjust_size("user");
                data.on("change:username", function (n,e) {
                    // tuve que poner un timer porque sino se ajusta primero el espacio (con el tamaño viejo) y luego se ajusta el nuevo tamaño actual
                    //setTimeout(function () {
                        // console.log('launchbar.adjust_size("user");');
                        launchbar.adjust_size("user");
                    //}, 500);
                });
            });
            
            tree.search("login_btn").on("click", function () {                
                jwebdesk.wait_service("user-auth").then(function (user){
                    return user.login();
                }).then(function (obj) {
                    jwebdesk.reload();
                    //data.set("username", obj.user.name);                    
                    //data.set("logged", true);
                    //launchbar.adjust_size("user");
                });
            });
            
            // TEMPORAL
            var context_menu = null;
            var just_created = false; // esto es para eludir el problema de que el evento del mouse primero se ejecuta en el botón (tree.search("user_btn").on("click")  y luego de forma global (jwk.ui.render.mouse.on("click")
            if (jwk.ui.render.mouse) {
                jwk.ui.render.mouse.on("click", function (n,e){
                    // console.log(arguments, e.component != context_menu);
                    if (!just_created && context_menu && e.component != context_menu) {
                        context_menu.destroy();
                        context_menu = null;
                    } else {
                        just_created = false;
                    }
                }, context_menu);
            }
            
            tree.search("user_btn").on("click", function (){ 
                // si ya existe lo cierro
                // busco su padre
                // creo los settings
                // ceo el componente
                
                var container = tree.render.container();
                
                var settings = {
                    ui_type: "menu",
                    data: [
                        { "text": "My Profile",    "command": "profile" },
                        { "separation" : true },
                        { "text": "logout",     "command": "logout" },
                    ],
                    position: {
                        my: "right top",
                        at: "right bottom",
                        of: "[path='" + tree.search("user_btn").path + "']",
                    }
                }
                        
                context_menu = jwk.ui.display_component(settings);
                just_created = true;
                        
                context_menu.on("command", function (n, e) {
                    switch (e.command) {
                        case "profile":
                            // console.log("profile", data.get("webident"));
                            jwebdesk.open_app("jwebdesk~jwebdesk-webident@alpha-0.5", { access_token: jwk.getCookie("access_token"), namespace: "jwebdesk"});
                            break;
                        case "logout":
                            jwebdesk.wait_service("user-auth").then(function (user){
                                return user.logout();
                            }).then(function () {
                                jwebdesk.reload();
                                data.set("logged", false);
                                launchbar.adjust_size("user");
                            });
                        break;                        
                    }
                    context_menu.destroy();
                    context_menu = null;                        
                });
            })            
        });
    }
    
    jwebdesk.wait_app("jwebdesk~jwebdesk-launchbar@alpha-0.5").done(function (proxy) {        
        instalar_plugin(proxy.instance)
    });
    
});