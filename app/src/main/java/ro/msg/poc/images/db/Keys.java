/*
 * This file is generated by jOOQ.
 */
package ro.msg.poc.images.db;


import org.jooq.TableField;
import org.jooq.UniqueKey;
import org.jooq.impl.DSL;
import org.jooq.impl.Internal;

import ro.msg.poc.images.db.tables.Image;
import ro.msg.poc.images.db.tables.records.ImageRecord;


/**
 * A class modelling foreign key relationships and constraints of tables in 
 * public.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Keys {

    // -------------------------------------------------------------------------
    // UNIQUE and PRIMARY KEY definitions
    // -------------------------------------------------------------------------

    public static final UniqueKey<ImageRecord> IMAGE_PKEY = Internal.createUniqueKey(Image.IMAGE, DSL.name("image_pkey"), new TableField[] { Image.IMAGE.ID }, true);
}
