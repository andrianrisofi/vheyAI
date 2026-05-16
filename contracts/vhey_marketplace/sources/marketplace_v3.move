module vhey_marketplace::marketplace_v3 {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::object::{Self, DeleteRef, ExtendRef, Object, ObjectCore};

    const E_NOT_SELLER: u64 = 1;
    const E_PRICE_ZERO: u64 = 2;
    const E_ALREADY_SOLD: u64 = 3;
    const E_SELLER_CANNOT_BUY: u64 = 4;
    const E_LISTING_NOT_FOUND: u64 = 5;

    struct Store has key {
        listings: vector<address>,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct Listing has key {
        seller: address,
        token: Object<ObjectCore>,
        price_octas: u64,
        blob_name: String,
        image_uri: String,
        sold: bool,
        extend_ref: ExtendRef,
        delete_ref: DeleteRef,
    }

    #[event]
    struct Listed has drop, store {
        listing: address,
        seller: address,
        token: address,
        price_octas: u64,
        blob_name: String,
        image_uri: String,
    }

    #[event]
    struct Purchased has drop, store {
        listing: address,
        seller: address,
        buyer: address,
        token: address,
        price_octas: u64,
    }

    #[event]
    struct Delisted has drop, store {
        listing: address,
        seller: address,
        token: address,
    }

    fun init_module(account: &signer) {
        move_to(account, Store {
            listings: vector::empty<address>(),
        });
    }

    public entry fun list(
        seller: &signer,
        token: Object<ObjectCore>,
        price_octas: u64,
        blob_name: String,
        image_uri: String,
    ) acquires Store {
        assert!(price_octas > 0, E_PRICE_ZERO);

        let seller_address = signer::address_of(seller);
        let constructor_ref = object::create_object(seller_address);
        let listing_signer = object::generate_signer(&constructor_ref);
        let listing_address = object::address_from_constructor_ref(&constructor_ref);
        let token_address = object::object_address(&token);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);

        object::transfer<ObjectCore>(seller, token, listing_address);

        move_to(&listing_signer, Listing {
            seller: seller_address,
            token,
            price_octas,
            blob_name,
            image_uri,
            sold: false,
            extend_ref,
            delete_ref,
        });

        vector::push_back(&mut borrow_global_mut<Store>(@vhey_marketplace).listings, listing_address);

        event::emit(Listed {
            listing: listing_address,
            seller: seller_address,
            token: token_address,
            price_octas,
            blob_name,
            image_uri,
        });
    }

    public entry fun buy(
        buyer: &signer,
        listing: Object<Listing>,
    ) acquires Listing, Store {
        let buyer_address = signer::address_of(buyer);
        let listing_address = object::object_address(&listing);
        let listing_ref = borrow_global_mut<Listing>(listing_address);

        assert!(!listing_ref.sold, E_ALREADY_SOLD);
        assert!(buyer_address != listing_ref.seller, E_SELLER_CANNOT_BUY);

        listing_ref.sold = true;
        remove_listing(listing_address);
        coin::transfer<AptosCoin>(buyer, listing_ref.seller, listing_ref.price_octas);

        let listing_signer = object::generate_signer_for_extending(&listing_ref.extend_ref);
        object::transfer<ObjectCore>(&listing_signer, listing_ref.token, buyer_address);

        event::emit(Purchased {
            listing: listing_address,
            seller: listing_ref.seller,
            buyer: buyer_address,
            token: object::object_address(&listing_ref.token),
            price_octas: listing_ref.price_octas,
        });
    }

    public entry fun delist(
        seller: &signer,
        listing: Object<Listing>,
    ) acquires Listing, Store {
        let seller_address = signer::address_of(seller);
        let listing_address = object::object_address(&listing);
        let listing_ref = borrow_global<Listing>(listing_address);

        assert!(listing_ref.seller == seller_address, E_NOT_SELLER);
        assert!(!listing_ref.sold, E_ALREADY_SOLD);

        let listing_signer = object::generate_signer_for_extending(&listing_ref.extend_ref);
        object::transfer<ObjectCore>(&listing_signer, listing_ref.token, seller_address);
        remove_listing(listing_address);

        let Listing {
            seller,
            token,
            price_octas: _,
            blob_name: _,
            image_uri: _,
            sold: _,
            extend_ref: _,
            delete_ref,
        } = move_from<Listing>(listing_address);

        event::emit(Delisted {
            listing: listing_address,
            seller,
            token: object::object_address(&token),
        });

        object::delete(delete_ref);
    }

    fun remove_listing(listing_address: address) acquires Store {
        let store = borrow_global_mut<Store>(@vhey_marketplace);
        let index = 0;
        let length = vector::length(&store.listings);

        while (index < length) {
            if (*vector::borrow(&store.listings, index) == listing_address) {
                vector::swap_remove(&mut store.listings, index);
                return;
            };
            index = index + 1;
        };

        abort E_LISTING_NOT_FOUND
    }

    #[view]
    public fun get_active_listings(): vector<address> acquires Store {
        borrow_global<Store>(@vhey_marketplace).listings
    }

    #[view]
    public fun get_listing(
        listing: Object<Listing>,
    ): (address, address, u64, String, String, bool) acquires Listing {
        let listing_address = object::object_address(&listing);
        let listing_ref = borrow_global<Listing>(listing_address);

        (
            listing_ref.seller,
            object::object_address(&listing_ref.token),
            listing_ref.price_octas,
            listing_ref.blob_name,
            listing_ref.image_uri,
            listing_ref.sold,
        )
    }
}
