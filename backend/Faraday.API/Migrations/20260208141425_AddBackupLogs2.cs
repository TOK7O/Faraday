using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Faraday.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBackupLogs2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WeightReadings_RackId_Timestamp",
                table: "WeightReadings");

            migrationBuilder.DropIndex(
                name: "IX_TemperatureReadings_RackId_Timestamp",
                table: "TemperatureReadings");

            migrationBuilder.DropColumn(
                name: "ExpectedWeightKg",
                table: "RackSlots");

            migrationBuilder.DropColumn(
                name: "LastMeasuredWeightKg",
                table: "RackSlots");

            migrationBuilder.DropColumn(
                name: "LastWeightCheck",
                table: "RackSlots");

            migrationBuilder.RenameColumn(
                name: "WeightKg",
                table: "WeightReadings",
                newName: "MeasuredWeightKg");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "WeightReadings",
                type: "integer",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedWeightKg",
                table: "WeightReadings",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "TemperatureReadings",
                type: "integer",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentTemperature",
                table: "Racks",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentTotalWeightKg",
                table: "Racks",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedTotalWeightKg",
                table: "Racks",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastTemperatureCheck",
                table: "Racks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastWeightCheck",
                table: "Racks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeightReadings_RackId",
                table: "WeightReadings",
                column: "RackId");

            migrationBuilder.CreateIndex(
                name: "IX_TemperatureReadings_RackId",
                table: "TemperatureReadings",
                column: "RackId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WeightReadings_RackId",
                table: "WeightReadings");

            migrationBuilder.DropIndex(
                name: "IX_TemperatureReadings_RackId",
                table: "TemperatureReadings");

            migrationBuilder.DropColumn(
                name: "ExpectedWeightKg",
                table: "WeightReadings");

            migrationBuilder.DropColumn(
                name: "CurrentTemperature",
                table: "Racks");

            migrationBuilder.DropColumn(
                name: "CurrentTotalWeightKg",
                table: "Racks");

            migrationBuilder.DropColumn(
                name: "ExpectedTotalWeightKg",
                table: "Racks");

            migrationBuilder.DropColumn(
                name: "LastTemperatureCheck",
                table: "Racks");

            migrationBuilder.DropColumn(
                name: "LastWeightCheck",
                table: "Racks");

            migrationBuilder.RenameColumn(
                name: "MeasuredWeightKg",
                table: "WeightReadings",
                newName: "WeightKg");

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "WeightReadings",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AlterColumn<long>(
                name: "Id",
                table: "TemperatureReadings",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedWeightKg",
                table: "RackSlots",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LastMeasuredWeightKg",
                table: "RackSlots",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastWeightCheck",
                table: "RackSlots",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeightReadings_RackId_Timestamp",
                table: "WeightReadings",
                columns: new[] { "RackId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_TemperatureReadings_RackId_Timestamp",
                table: "TemperatureReadings",
                columns: new[] { "RackId", "Timestamp" });
        }
    }
}
