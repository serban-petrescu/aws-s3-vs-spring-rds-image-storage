package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V2__Insert_images extends BaseJavaMigration {
    public static final String[] IMAGES = {"10kb.png", "10kb-2.png", "10kb-3.png", "10kb-4.png", "10kb-5.png",
            "100kb.png", "100kb-2.png", "100kb-3.png", "100kb-4.png", "100kb-5.png",
            "1mb.png", "5mb.png", "10mb.png"};

    @Override
    public void migrate(Context context) throws Exception {
        for (var image : IMAGES) {
            try (var insert = context.getConnection().prepareStatement("INSERT INTO public.image VALUES(?, ?, ?)")) {
                insert.setString(1, image);
                insert.setString(2, "image/png");
                insert.setBinaryStream(3, this.getClass().getResourceAsStream("/static/" + image));
                insert.execute();
            }
        }
    }
}
