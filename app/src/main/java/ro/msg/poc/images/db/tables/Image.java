/*
 * This file is generated by jOOQ.
 */
package ro.msg.poc.images.db.tables;


import java.util.Arrays;
import java.util.List;

import org.jooq.Field;
import org.jooq.ForeignKey;
import org.jooq.Name;
import org.jooq.Record;
import org.jooq.Row3;
import org.jooq.Schema;
import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.TableOptions;
import org.jooq.UniqueKey;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.jooq.impl.TableImpl;

import ro.msg.poc.images.db.Keys;
import ro.msg.poc.images.db.Public;
import ro.msg.poc.images.db.tables.records.ImageRecord;


/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class Image extends TableImpl<ImageRecord> {

    private static final long serialVersionUID = 1L;

    /**
     * The reference instance of <code>public.image</code>
     */
    public static final Image IMAGE = new Image();

    /**
     * The class holding records for this type
     */
    @Override
    public Class<ImageRecord> getRecordType() {
        return ImageRecord.class;
    }

    /**
     * The column <code>public.image.id</code>.
     */
    public final TableField<ImageRecord, String> ID = createField(DSL.name("id"), SQLDataType.VARCHAR(32).nullable(false), this, "");

    /**
     * The column <code>public.image.mime</code>.
     */
    public final TableField<ImageRecord, String> MIME = createField(DSL.name("mime"), SQLDataType.VARCHAR(255).nullable(false), this, "");

    /**
     * The column <code>public.image.body</code>.
     */
    public final TableField<ImageRecord, byte[]> BODY = createField(DSL.name("body"), SQLDataType.BLOB.nullable(false), this, "");

    private Image(Name alias, Table<ImageRecord> aliased) {
        this(alias, aliased, null);
    }

    private Image(Name alias, Table<ImageRecord> aliased, Field<?>[] parameters) {
        super(alias, null, aliased, parameters, DSL.comment(""), TableOptions.table());
    }

    /**
     * Create an aliased <code>public.image</code> table reference
     */
    public Image(String alias) {
        this(DSL.name(alias), IMAGE);
    }

    /**
     * Create an aliased <code>public.image</code> table reference
     */
    public Image(Name alias) {
        this(alias, IMAGE);
    }

    /**
     * Create a <code>public.image</code> table reference
     */
    public Image() {
        this(DSL.name("image"), null);
    }

    public <O extends Record> Image(Table<O> child, ForeignKey<O, ImageRecord> key) {
        super(child, key, IMAGE);
    }

    @Override
    public Schema getSchema() {
        return Public.PUBLIC;
    }

    @Override
    public UniqueKey<ImageRecord> getPrimaryKey() {
        return Keys.IMAGE_PKEY;
    }

    @Override
    public List<UniqueKey<ImageRecord>> getKeys() {
        return Arrays.<UniqueKey<ImageRecord>>asList(Keys.IMAGE_PKEY);
    }

    @Override
    public Image as(String alias) {
        return new Image(DSL.name(alias), this);
    }

    @Override
    public Image as(Name alias) {
        return new Image(alias, this);
    }

    /**
     * Rename this table
     */
    @Override
    public Image rename(String name) {
        return new Image(DSL.name(name), null);
    }

    /**
     * Rename this table
     */
    @Override
    public Image rename(Name name) {
        return new Image(name, null);
    }

    // -------------------------------------------------------------------------
    // Row3 type methods
    // -------------------------------------------------------------------------

    @Override
    public Row3<String, String, byte[]> fieldsRow() {
        return (Row3) super.fieldsRow();
    }
}
